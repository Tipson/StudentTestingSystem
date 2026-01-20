import React, {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {exchangeCodeForTokens, persistTokens} from '@shared/auth/keycloak.js';
import {notifyCustom} from '@shared/notifications/notificationCenter.js';
import './SwaggerPage.css';

const DEFAULT_STATUS = {
    state: 'loading',
    title: 'Авторизация',
    message: 'Проверяем ответ от Keycloak...',
};

const EXCHANGE_STATUS_PREFIX = 'swagger:pkce_exchange';
const EXCHANGE_INFLIGHT_TTL_MS = 20_000;
const EXCHANGE_POLL_INTERVAL_MS = 700;
const EXCHANGE_POLL_LIMIT = 6;

const getExchangeKeys = (code) => ({
    doneKey: `${EXCHANGE_STATUS_PREFIX}:${code}`,
    inflightKey: `${EXCHANGE_STATUS_PREFIX}:${code}:inflight`,
});

const buildErrorMessage = (error, description) => {
    if (!error && !description) {
        return 'Не удалось выполнить авторизацию.';
    }
    if (error && description) {
        return `${error}: ${description}`;
    }
    return error || description;
};

export default function SwaggerOAuthRedirect() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState(DEFAULT_STATUS);

    // Обмениваем код авторизации на токены и сохраняем их.
    useEffect(() => {
        let isActive = true;
        let redirectTimer = null;

        const finishWithError = (message) => {
            if (!isActive) return;
            setStatus({
                state: 'error',
                title: 'Ошибка авторизации',
                message,
            });
            notifyCustom({
                type: 'error',
                message,
                duration: 4000,
            });
        };

        const run = async () => {
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            if (error || errorDescription) {
                finishWithError(buildErrorMessage(error, errorDescription));
                return;
            }

            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (!code) {
                finishWithError('Код авторизации не найден.');
                return;
            }

            const {doneKey, inflightKey} = getExchangeKeys(code);

            if (window.sessionStorage.getItem(doneKey) === 'done') {
                setStatus({
                    state: 'success',
                    title: 'Готово',
                    message: 'Код уже обработан. Перенаправляем в Swagger...',
                });
                redirectTimer = window.setTimeout(() => {
                    navigate('/swagger', {replace: true});
                }, 400);
                return;
            }

            const inflightValue = window.sessionStorage.getItem(inflightKey);
            if (inflightValue) {
                const inflightStartedAt = Number(inflightValue);
                const inflightAge = Number.isFinite(inflightStartedAt)
                    ? Date.now() - inflightStartedAt
                    : null;

                if (inflightAge != null && inflightAge > EXCHANGE_INFLIGHT_TTL_MS) {
                    window.sessionStorage.removeItem(inflightKey);
                } else {
                    setStatus({
                        state: 'loading',
                        title: 'Авторизация',
                        message: 'Обмен кода уже выполняется. Ожидаем завершение...',
                    });

                    for (let i = 0; i < EXCHANGE_POLL_LIMIT; i += 1) {
                        await new Promise((resolve) => {
                            redirectTimer = window.setTimeout(resolve, EXCHANGE_POLL_INTERVAL_MS);
                        });
                        if (!isActive) return;
                        if (window.sessionStorage.getItem(doneKey) === 'done') {
                            setStatus({
                                state: 'success',
                                title: 'Готово',
                                message: 'Код уже обработан. Перенаправляем в Swagger...',
                            });
                            redirectTimer = window.setTimeout(() => {
                                navigate('/swagger', {replace: true});
                            }, 400);
                            return;
                        }
                    }

                    window.sessionStorage.removeItem(inflightKey);
                }
            }

            if (window.sessionStorage.getItem(inflightKey)) {
                setStatus({
                    state: 'loading',
                    title: 'Авторизация',
                    message: 'Обмен кода уже выполняется. Ожидаем завершение...',
                });
                return;
            }

            setStatus({
                state: 'loading',
                title: 'Авторизация',
                message: 'Получаем токены из Keycloak...',
            });

            window.sessionStorage.setItem(inflightKey, String(Date.now()));

            try {
                const tokenResponse = await exchangeCodeForTokens({code, state});
                const tokens = persistTokens(tokenResponse);

                if (!isActive) return;

                window.sessionStorage.setItem(doneKey, 'done');
                window.sessionStorage.removeItem(inflightKey);

                setStatus({
                    state: 'success',
                    title: 'Готово',
                    message: tokens?.accessToken
                        ? 'Токены сохранены. Перенаправляем в Swagger...'
                        : 'Ответ получен. Перенаправляем в Swagger...',
                });

                notifyCustom({
                    type: 'success',
                    message: 'Авторизация завершена.',
                    duration: 2500,
                });

                redirectTimer = window.setTimeout(() => {
                    navigate('/swagger', {replace: true});
                }, 800);
            } catch (error) {
                window.sessionStorage.removeItem(inflightKey);
                finishWithError(error?.message || 'Не удалось получить токены.');
            }
        };

        run();

        return () => {
            isActive = false;
            if (redirectTimer) {
                window.clearTimeout(redirectTimer);
            }
        };
    }, [navigate, searchParams]);

    return (
        <main className="swagger-shell">
            <div className="swagger-callback">
                <h2>{status.title}</h2>
                <p>{status.message}</p>
                {status.state === 'error' && (
                    <button
                        className="swagger-button"
                        type="button"
                        onClick={() => navigate('/swagger', {replace: true})}
                    >
                        Вернуться в Swagger
                    </button>
                )}
            </div>
        </main>
    );
}
