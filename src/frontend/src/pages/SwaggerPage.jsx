import React, {useMemo, useState} from 'react';
import {API_BASE_URLS} from '@api/config.js';
import {apiClients} from '@api/client.js';
import {AUTH} from '@api/auth.js';
import {notifyCustom} from '@shared/notifications/notificationCenter.js';
import {clearStoredTokens, getStoredTokens, startKeycloakLogin} from '@shared/auth/keycloak.js';
import './SwaggerPage.css';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const AUTH_OPTIONS = [
    {value: AUTH.TRUE, label: 'Требуется'},
    {value: AUTH.OPTIONAL, label: 'Опционально'},
    {value: AUTH.FALSE, label: 'Без авторизации'},
];

const DEFAULT_REQUEST = {
    service: 'assessment',
    method: 'GET',
    path: '/healthz',
    auth: AUTH.FALSE,
    body: '',
};

const formatToken = (token) => {
    if (!token) return '';
    return `${token.slice(0, 14)}...${token.slice(-10)}`;
};

const formatResponse = (payload) => {
    if (!payload || payload.data == null) return '';
    if (typeof payload.data === 'string') return payload.data;
    try {
        return JSON.stringify(payload.data, null, 2);
    } catch (error) {
        return String(payload.data);
    }
};

export default function SwaggerPage() {
    const [tokens, setTokens] = useState(() => getStoredTokens());
    const [request, setRequest] = useState(DEFAULT_REQUEST);
    const [response, setResponse] = useState(null);
    const [pending, setPending] = useState(false);

    const hasToken = Boolean(tokens?.accessToken);
    const tokenLabel = hasToken
        ? 'Токен сохранен'
        : 'Токен не найден';
    const tokenPreview = hasToken ? formatToken(tokens.accessToken) : '';
    const tokenExpiresAt = tokens?.expiresAt
        ? new Date(tokens.expiresAt).toLocaleString('ru-RU')
        : '';

    const handleLogin = async () => {
        await startKeycloakLogin();
    };

    const handleLogout = () => {
        clearStoredTokens();
        setTokens(null);
    };

    const handleCopyToken = async () => {
        if (!tokens?.accessToken) {
            notifyCustom({
                type: 'warning',
                message: 'Нет токена для копирования.',
                duration: 2400,
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(tokens.accessToken);
            notifyCustom({
                type: 'success',
                message: 'Токен скопирован.',
                duration: 2000,
            });
        } catch (error) {
            notifyCustom({
                type: 'error',
                message: 'Не удалось скопировать токен.',
                duration: 2400,
            });
        }
    };

    // Отправка запроса через выбранный клиент.
    const handleSend = async () => {
        const trimmedBody = request.body.trim();
        let payload;

        if (trimmedBody) {
            try {
                payload = JSON.parse(trimmedBody);
            } catch (error) {
                notifyCustom({
                    type: 'error',
                    message: 'Неверный JSON в теле запроса.',
                    duration: 2600,
                });
                return;
            }
        }

        setPending(true);
        try {
            const client = apiClients[request.service] ?? apiClients.assessment;
            const result = await client.request({
                method: request.method,
                url: request.path,
                data: payload,
                auth: request.auth,
            });

            setResponse({
                ok: true,
                status: result.status,
                data: result.data,
            });
        } catch (error) {
            const status = error?.response?.status ?? null;
            const data = error?.response?.data ?? error?.message ?? error;
            setResponse({
                ok: false,
                status,
                data,
            });
        } finally {
            setPending(false);
        }
    };

    // Список эндпоинтов для отображения.
    const endpointGroups = useMemo(
        () => [
            {
                title: 'Health',
                items: [
                    {method: 'GET', path: '/healthz'},
                ],
            },
            {
                title: 'AI',
                items: [
                    {method: 'POST', path: '/api/ai/attempts/{attemptId}/questions/{questionId}/hint'},
                ],
            },
            {
                title: 'Assessment: Tests',
                items: [
                    {method: 'POST', path: '/api/tests'},
                    {method: 'GET', path: '/api/tests'},
                    {method: 'GET', path: '/api/tests/{id}'},
                    {method: 'PUT', path: '/api/tests/{id}'},
                    {method: 'DELETE', path: '/api/tests/{id}'},
                    {method: 'GET', path: '/api/tests/my'},
                    {method: 'PUT', path: '/api/tests/{id}/settings'},
                    {method: 'PUT', path: '/api/tests/{id}/access-type/{accessType}'},
                    {method: 'PUT', path: '/api/tests/{id}/availability'},
                    {method: 'PUT', path: '/api/tests/{id}/publish'},
                    {method: 'PUT', path: '/api/tests/{id}/unpublish'},
                    {method: 'POST', path: '/api/tests/{id}/access/users'},
                    {method: 'POST', path: '/api/tests/{id}/access/groups'},
                    {method: 'POST', path: '/api/tests/{id}/access/invite-links'},
                    {method: 'GET', path: '/api/tests/{id}/access'},
                    {method: 'DELETE', path: '/api/tests/access/{accessId}'},
                    {method: 'POST', path: '/api/tests/join/{inviteCode}'},
                ],
            },
            {
                title: 'Assessment: Attempts',
                items: [
                    {method: 'POST', path: '/api/tests/{testId}/attempts'},
                    {method: 'GET', path: '/api/tests/{testId}/attempts'},
                    {method: 'GET', path: '/api/tests/{testId}/results'},
                    {method: 'GET', path: '/api/attempts/{id}'},
                    {method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}'},
                    {method: 'POST', path: '/api/attempts/{id}/submit'},
                    {method: 'GET', path: '/api/attempts/{id}/result'},
                    {method: 'GET', path: '/api/attempts/my'},
                    {method: 'GET', path: '/api/attempts/pending-review'},
                    {method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}/grade'},
                ],
            },
            {
                title: 'Assessment: Questions',
                items: [
                    {method: 'POST', path: '/api/tests/{testId}/questions'},
                    {method: 'GET', path: '/api/tests/{testId}/questions'},
                    {method: 'GET', path: '/api/questions/{id}'},
                    {method: 'PUT', path: '/api/questions/{id}'},
                    {method: 'DELETE', path: '/api/questions/{id}'},
                    {method: 'PUT', path: '/api/tests/{testId}/questions/reorder'},
                ],
            },
            {
                title: 'Media',
                items: [
                    {method: 'POST', path: '/api/files/upload'},
                    {method: 'POST', path: '/api/files/get'},
                    {method: 'POST', path: '/api/files/download'},
                    {method: 'GET', path: '/api/files/my'},
                    {method: 'POST', path: '/api/files/delete'},
                ],
            },
            {
                title: 'Identity: Groups',
                items: [
                    {method: 'POST', path: '/api/groups'},
                    {method: 'GET', path: '/api/groups'},
                    {method: 'PUT', path: '/api/groups/{id}'},
                    {method: 'DELETE', path: '/api/groups/{id}'},
                    {method: 'PUT', path: '/api/groups/{id}/active'},
                    {method: 'GET', path: '/api/groups/{id}/students'},
                    {method: 'POST', path: '/api/groups/{id}/students'},
                ],
            },
            {
                title: 'Identity: Me',
                items: [
                    {method: 'GET', path: '/api/me/me'},
                    {method: 'PUT', path: '/api/me/group'},
                    {method: 'DELETE', path: '/api/me/group'},
                ],
            },
        ],
        [],
    );

    return (
        <main className="swagger-shell">
            <header className="swagger-hero">
                <div className="swagger-title">
                    <div className="swagger-eyebrow">Swagger-панель</div>
                    <h1>API-консоль</h1>
                    <p className="swagger-subtitle">
                        Базовая страница для тестирования API.
                    </p>
                </div>
                <div className="swagger-card">
                    <h3>Авторизация</h3>
                    <p className="swagger-subtitle">{tokenLabel}</p>
                    {tokenPreview && (
                        <p className="swagger-subtitle">Access token: {tokenPreview}</p>
                    )}
                    {tokenExpiresAt && (
                        <p className="swagger-subtitle">
                            Истекает: {tokenExpiresAt}
                        </p>
                    )}
                    <div className="swagger-auth-actions">
                        <button className="swagger-button" type="button" onClick={handleLogin}>
                            Войти через Keycloak
                        </button>
                        <button
                            className="swagger-button secondary"
                            type="button"
                            onClick={handleLogout}
                            disabled={!hasToken}
                        >
                            Выйти
                        </button>
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={handleCopyToken}
                        >
                            Скопировать токен
                        </button>
                    </div>
                </div>
            </header>

            <section className="swagger-grid">
                <div className="swagger-panel">
                    <h2>Базовые URL</h2>
                    <ul className="swagger-url-list">
                        {Object.entries(API_BASE_URLS).map(([key, value]) => (
                            <li key={key} className="swagger-url-item">
                                <span>{key}</span>
                                <code>{value}</code>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="swagger-panel">
                    <h2>Конструктор запросов</h2>
                    <div className="swagger-field">
                        <label htmlFor="swagger-service">Сервис</label>
                        <select
                            id="swagger-service"
                            className="swagger-select"
                            value={request.service}
                            onChange={(event) => setRequest((prev) => ({...prev, service: event.target.value}))}
                        >
                            {Object.keys(API_BASE_URLS).map((service) => (
                                <option key={service} value={service}>{service}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-method">Метод</label>
                        <select
                            id="swagger-method"
                            className="swagger-select"
                            value={request.method}
                            onChange={(event) => setRequest((prev) => ({...prev, method: event.target.value}))}
                        >
                            {METHODS.map((method) => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-path">Путь</label>
                        <input
                            id="swagger-path"
                            className="swagger-input"
                            value={request.path}
                            onChange={(event) => setRequest((prev) => ({...prev, path: event.target.value}))}
                            placeholder="/api/..."
                        />
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-auth">Авторизация</label>
                        <select
                            id="swagger-auth"
                            className="swagger-select"
                            value={request.auth}
                            onChange={(event) => setRequest((prev) => ({...prev, auth: event.target.value}))}
                        >
                            {AUTH_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-body">Тело (JSON)</label>
                        <textarea
                            id="swagger-body"
                            className="swagger-textarea"
                            value={request.body}
                            onChange={(event) => setRequest((prev) => ({...prev, body: event.target.value}))}
                            placeholder="{}"
                        />
                    </div>
                    <button
                        className="swagger-button"
                        type="button"
                        onClick={handleSend}
                        disabled={pending}
                    >
                        {pending ? '...' : 'Отправить запрос'}
                    </button>
                </div>
            </section>

            <section className="swagger-grid">
                <div className="swagger-panel">
                    <h2>Ответ</h2>
                    <div className="swagger-response">
                        {response ? (
                            `HTTP ${response.status ?? '—'}\n${formatResponse(response)}`
                        ) : (
                            'Нет данных'
                        )}
                    </div>
                </div>
            </section>

            <section className="swagger-endpoints">
                <h2>Эндпоинты</h2>
                {endpointGroups.map((group) => (
                    <details key={group.title} className="swagger-group" open>
                        <summary>{group.title}</summary>
                        {group.items.map((item) => (
                            <div key={`${item.method}-${item.path}`} className="swagger-endpoint">
                                <span className={`method-badge ${item.method.toLowerCase()}`}>
                                    {item.method}
                                </span>
                                <div className="endpoint-meta">
                                    <div className="endpoint-path">{item.path}</div>
                                    {item.description && (
                                        <div className="endpoint-desc">{item.description}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </details>
                ))}
            </section>
        </main>
    );
}