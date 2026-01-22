import {
    getStoredTokens,
    persistTokens,
    refreshKeycloakTokens,
} from '@shared/auth/keycloak.js';

// Флаги авторизации для запросов: OPTIONAL, TRUE (обязательно) или FALSE (пропустить).
export const AUTH = Object.freeze({
    OPTIONAL: 'optional',
    TRUE: 'true',
    FALSE: 'false',
});

// Буфер времени до истечения токена (2 минуты) - обновляем заранее
const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000;

// Флаг для предотвращения параллельных обновлений
let refreshPromise = null;

/**
 * Проверяет, нужно ли обновить токен
 * @param {Object} tokens - объект с токенами
 * @returns {boolean}
 */
const shouldRefreshToken = (tokens) => {
    if (!tokens?.expiresAt) return false;
    const now = Date.now();
    return now >= tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS;
};

/**
 * Обновляет токен через Keycloak
 * @returns {Promise<string|null>} - новый access token или null
 */
const doRefreshToken = async () => {
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) {
        console.warn('[auth] No refresh token available');
        return null;
    }

    try {
        const response = await refreshKeycloakTokens(tokens.refreshToken);
        const newTokens = persistTokens(response);
        console.log('[auth] Token refreshed successfully');
        return newTokens?.accessToken || null;
    } catch (error) {
        console.error('[auth] Token refresh failed:', error.message);
        return null;
    }
};

/**
 * Получает access token, автоматически обновляя его при необходимости
 * @param {boolean} [silent=false] - не выбрасывать ошибку если токена нет
 * @param {boolean} [forceRefresh=false] - принудительно обновить токен
 * @returns {Promise<string|null>|string|null} - access token или null
 */
export const getAccessToken = (silent = false, forceRefresh = false) => {
    if (typeof window === 'undefined') {
        return null;
    }

    const tokens = getStoredTokens();

    // Если нужно принудительное обновление
    if (forceRefresh && tokens?.refreshToken) {
        // Возвращаем Promise для async обновления
        if (refreshPromise) return refreshPromise;

        refreshPromise = doRefreshToken().finally(() => {
            refreshPromise = null;
        });

        return refreshPromise;
    }

    // Если токен истёк или скоро истечёт - обновляем в фоне
    if (tokens?.accessToken && shouldRefreshToken(tokens) && tokens.refreshToken) {
        // Запускаем обновление в фоне, но возвращаем текущий токен
        if (!refreshPromise) {
            refreshPromise = doRefreshToken().finally(() => {
                refreshPromise = null;
            });
        }
    }

    return tokens?.accessToken || window.localStorage.getItem('accessToken') || null;
};

/**
 * Синхронная версия получения токена (без автообновления)
 * Используется там, где нужен синхронный доступ
 * @returns {string|null}
 */
export const getAccessTokenSync = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.localStorage.getItem('accessToken') || null;
};