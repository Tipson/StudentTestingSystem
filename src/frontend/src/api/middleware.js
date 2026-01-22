import {AUTH, getAccessTokenSync} from './auth.js';
import {notifyError} from '@shared/notifications/notificationCenter.js';
import {
    getStoredTokens,
    persistTokens,
    refreshKeycloakTokens,
} from '@shared/auth/keycloak.js';

// Буфер времени до истечения токена (2 минуты)
const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000;

// Флаг для предотвращения параллельных обновлений
let refreshPromise = null;

/**
 * Проверяет, нужно ли обновить токен
 */
const shouldRefreshToken = (tokens) => {
    if (!tokens?.expiresAt) return false;
    return Date.now() >= tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS;
};

/**
 * Обновляет токен через Keycloak
 */
const doRefreshToken = async () => {
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) {
        return null;
    }

    try {
        const response = await refreshKeycloakTokens(tokens.refreshToken);
        const newTokens = persistTokens(response);
        console.log('[middleware] Token refreshed successfully');
        return newTokens?.accessToken || null;
    } catch (error) {
        console.error('[middleware] Token refresh failed:', error.message);
        return null;
    }
};

/**
 * Получает актуальный токен, обновляя его при необходимости
 */
const getValidToken = async () => {
    const tokens = getStoredTokens();

    if (!tokens?.accessToken) {
        return getAccessTokenSync();
    }

    // Если токен истекает - обновляем
    if (shouldRefreshToken(tokens) && tokens.refreshToken) {
        if (!refreshPromise) {
            refreshPromise = doRefreshToken().finally(() => {
                refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        return newToken || tokens.accessToken;
    }

    return tokens.accessToken;
};

// Axios-мидлвар, который добавляет Authorization в зависимости от флага auth.
export const applyAuthMiddleware = (client) => {
    client.interceptors.request.use(async (config) => {
        const authMode = config.auth ?? AUTH.TRUE;

        // Удаляем пользовательский флаг, чтобы он не попадал внутрь axios.
        if ('auth' in config) {
            delete config.auth;
        }

        const headers = config.headers ?? {};

        if (authMode === AUTH.FALSE) {
            if (typeof headers.delete === 'function') {
                headers.delete('Authorization');
            } else if (headers.Authorization) {
                delete headers.Authorization;
            }
            config.headers = headers;
            return config;
        }

        // Получаем валидный токен (с автообновлением)
        const token = await getValidToken();

        if (!token) {
            if (authMode === AUTH.TRUE) {
                return Promise.reject(new Error('Авторизация обязательна для этого запроса'));
            }
            return config;
        }

        if (typeof headers.set === 'function') {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            headers.Authorization = `Bearer ${token}`;
        }

        config.headers = headers;
        return config;
    });

    client.interceptors.response.use(
        (response) => response,
        (error) => {
            const shouldNotify = !error?.config?.silentError;
            const isCanceled = error?.code === 'ERR_CANCELED';

            if (shouldNotify && !isCanceled) {
                notifyError(error);
            }

            return Promise.reject(error);
        },
    );
};
