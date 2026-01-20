import {getAccessToken} from '@api/auth.js';
import {getKeycloakConfig} from './keycloak.js';

const normalizeBaseUrl = (value) => (value ? value.replace(/\/$/, '') : '');

const buildAccountBaseUrl = () => {
    const config = getKeycloakConfig();
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    if (!baseUrl || !config.realm) return '';
    return `${baseUrl}/realms/${config.realm}/account`;
};

const resolveOtpPaths = () => {
    const env = typeof process !== 'undefined' ? process.env : {};
    const custom = env.REACT_APP_KEYCLOAK_OTP_PATH || '';
    const paths = ['/credentials/otp', '/credentials/totp'];
    if (custom) {
        if (!custom.startsWith('/')) {
            return [`/${custom}`, ...paths];
        }
        return [custom, ...paths];
    }
    return paths;
};

const parseAccountResponse = async (response) => {
    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
};

const requestAccount = async (path, options = {}) => {
    const token = getAccessToken();
    if (!token) {
        throw new Error('Нет access token для обращения к Keycloak.');
    }

    const baseUrl = buildAccountBaseUrl();
    if (!baseUrl) {
        throw new Error('Не задан URL Keycloak.');
    }

    const url = `${baseUrl}${path}`;
    const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const payload = await parseAccountResponse(response);
        const message = typeof payload === 'string'
            ? payload
            : payload?.error_description || payload?.error || payload?.message;
        const error = new Error(message || 'Ошибка обращения к Keycloak account API.');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return parseAccountResponse(response);
};

const buildFormBody = (payload) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
        if (value == null || value === '') return;
        params.set(key, String(value));
    });
    return params;
};

export const getKeycloakAccountUrl = () => buildAccountBaseUrl();

// Получает профиль из Keycloak account API.
export const fetchKeycloakAccountProfile = async () =>
    requestAccount('', {method: 'GET'});

// Обновляет профиль в Keycloak.
export const updateKeycloakAccountProfile = async (payload) =>
    requestAccount('', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });

// Получает список сессий.
export const fetchKeycloakSessions = async () =>
    requestAccount('/sessions', {method: 'GET'});

// Получает список credentials (пароль/OTP/WebAuthn).
export const fetchKeycloakCredentials = async () =>
    requestAccount('/credentials', {method: 'GET'});

// Получает данные для подключения OTP (секрет/QR).
export const fetchKeycloakOtpSecret = async () => {
    const paths = resolveOtpPaths();
    let lastError = null;

    for (const path of paths) {
        try {
            return await requestAccount(path, {method: 'GET'});
        } catch (error) {
            lastError = error;
            if (error?.status !== 404) {
                throw error;
            }
        }
    }

    throw lastError || new Error('OTP endpoint не найден.');
};

// Меняет пароль в Keycloak.
export const updateKeycloakPassword = async (payload) =>
    requestAccount('/credentials/password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });

// Подключает OTP (с кодом подтверждения).
export const enableKeycloakOtp = async (payload) => {
    const code = payload?.totp || payload?.otp || payload?.code || '';
    const normalized = {
        totp: code || undefined,
        otp: code || undefined,
        totpSecret: payload?.totpSecret || payload?.secret || payload?.secretEncoded || '',
        userLabel: payload?.userLabel || payload?.deviceName || '',
        deviceName: payload?.deviceName || payload?.userLabel || '',
    };

    const formBody = buildFormBody(normalized);
    const paths = resolveOtpPaths();
    let lastError = null;

    for (const path of paths) {
        try {
            return await requestAccount(path, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(normalized),
            });
        } catch (error) {
            lastError = error;
            if (error?.status === 404) {
                continue;
            }
            if (error?.status === 415) {
                return requestAccount(path, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: formBody.toString(),
                });
            }
            throw error;
        }
    }

    throw lastError || new Error('OTP endpoint не найден.');
};

// Удаляет credential по id (например, OTP).
export const deleteKeycloakCredential = async (credentialId) =>
    requestAccount(`/credentials/${credentialId}`, {method: 'DELETE'});

// Завершает одну сессию пользователя.
export const logoutKeycloakSession = async (sessionId) => {
    try {
        return await requestAccount(`/sessions/${sessionId}`, {method: 'DELETE'});
    } catch (error) {
        // На некоторых версиях Keycloak используется POST /sessions/logout/{id}.
        return requestAccount(`/sessions/logout/${sessionId}`, {method: 'POST'});
    }
};

// Завершает все сессии пользователя.
export const logoutAllKeycloakSessions = async () =>
    requestAccount('/sessions/logout-all', {method: 'POST'});
