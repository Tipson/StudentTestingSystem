import React, {useEffect, useRef} from 'react';
import {notifyCustom} from '@shared/notifications/notificationCenter.js';
import {
    clearStoredTokens,
    getKeycloakRefreshConfig,
    getStoredTokens,
    persistTokens,
    refreshKeycloakTokens,
} from './keycloak.js';

const MIN_REFRESH_INTERVAL_MS = 5000;

const shouldRefreshSoon = (tokens, leewayMs) => {
    if (!tokens?.expiresAt) return true;
    return tokens.expiresAt - Date.now() <= leewayMs;
};

const isRefreshExpired = (tokens) => {
    if (!tokens?.refreshExpiresAt) return false;
    return tokens.refreshExpiresAt <= Date.now();
};

const shouldClearTokensOnError = (error) => {
    const status = error?.status || error?.response?.status;
    const code = error?.payload?.error;
    return status === 400 || status === 401 || code === 'invalid_grant';
};

const notifySessionExpired = () => {
    notifyCustom({
        type: 'warning',
        title: 'Сессия истекла',
        message: 'Не удалось обновить токен. Войдите снова через Keycloak.',
        duration: 6000,
    });
};

// Провайдер регулярно обновляет токены Keycloak.
export default function KeycloakTokenProvider({children}) {
    const refreshInFlightRef = useRef(false);
    const notifiedRef = useRef(false);
    const lastRefreshTokenRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const refreshConfig = getKeycloakRefreshConfig();
        const intervalMs = Math.max(refreshConfig.intervalMs, MIN_REFRESH_INTERVAL_MS);
        const leewayMs = refreshConfig.leewayMs;

        let timerId;

        const refreshIfNeeded = async () => {
            if (refreshInFlightRef.current) return;

            const tokens = getStoredTokens();
            if (!tokens?.refreshToken) return;

            if (tokens.refreshToken !== lastRefreshTokenRef.current) {
                lastRefreshTokenRef.current = tokens.refreshToken;
                notifiedRef.current = false;
            }

            if (isRefreshExpired(tokens)) {
                clearStoredTokens();
                if (!notifiedRef.current) {
                    notifySessionExpired();
                    notifiedRef.current = true;
                }
                return;
            }

            if (!shouldRefreshSoon(tokens, leewayMs)) return;

            refreshInFlightRef.current = true;
            try {
                const tokenResponse = await refreshKeycloakTokens(tokens.refreshToken);
                persistTokens(tokenResponse);
                notifiedRef.current = false;
            } catch (error) {
                if (shouldClearTokensOnError(error)) {
                    clearStoredTokens();
                    if (!notifiedRef.current) {
                        notifySessionExpired();
                        notifiedRef.current = true;
                    }
                } else {
                    console.warn('Ошибка обновления токена Keycloak', error);
                }
            } finally {
                refreshInFlightRef.current = false;
            }
        };

        refreshIfNeeded();
        timerId = window.setInterval(refreshIfNeeded, intervalMs);

        return () => {
            if (timerId) {
                clearInterval(timerId);
            }
        };
    }, []);

    return (
        <>
            {children}
        </>
    );
}
