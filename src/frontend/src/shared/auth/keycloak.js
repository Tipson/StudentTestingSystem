const STORAGE_KEYS = {
    tokens: 'swagger:tokens',
    pkceVerifier: 'swagger:pkce_verifier',
    pkceState: 'swagger:pkce_state',
};

const DEFAULT_CONFIG = {
    baseUrl: 'http://keycloak.oleg.agentik007.ru',
    realm: 'lms',
    clientId: 'swagger',
    scope: 'openid profile email',
    redirectPath: '/swagger/oauth2-redirect.html',
};

// Настройки Keycloak по умолчанию.
export const getKeycloakConfig = () => {
    const env = process.env;
    return {
        baseUrl: env.REACT_APP_KEYCLOAK_URL || env.REACT_APP_KEYCLOAK_BASE_URL || DEFAULT_CONFIG.baseUrl,
        realm: env.REACT_APP_KEYCLOAK_REALM || DEFAULT_CONFIG.realm,
        clientId: env.REACT_APP_KEYCLOAK_CLIENT_ID || DEFAULT_CONFIG.clientId,
        scope: env.REACT_APP_KEYCLOAK_SCOPE || DEFAULT_CONFIG.scope,
        redirectUri: env.REACT_APP_KEYCLOAK_REDIRECT_URI || '',
        redirectPath: env.REACT_APP_KEYCLOAK_REDIRECT_PATH || DEFAULT_CONFIG.redirectPath,
    };
};

const base64UrlEncode = (input) => {
    const bytes = new Uint8Array(input);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const createRandomString = (length = 32) => {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return base64UrlEncode(data);
};

const createPkceChallenge = async (verifier) => {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
};

export const getRedirectUri = () => {
    const config = getKeycloakConfig();
    if (config.redirectUri) return config.redirectUri;
    if (typeof window === 'undefined') return config.redirectPath;
    return new URL(config.redirectPath, window.location.origin).toString();
};

export const getStoredTokens = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.tokens);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('token storage read error', error);
        return null;
    }
};

// Сохраняет токены и обновляет localStorage.
export const persistTokens = (tokenResponse) => {
    if (typeof window === 'undefined') return null;
    if (!tokenResponse) return null;

    const payload = {
        accessToken: tokenResponse.access_token || '',
        refreshToken: tokenResponse.refresh_token || '',
        idToken: tokenResponse.id_token || '',
        expiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
    };

    window.localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(payload));
    if (payload.accessToken) {
        window.localStorage.setItem('accessToken', payload.accessToken);
    } else {
        window.localStorage.removeItem('accessToken');
    }

    return payload;
};

export const clearStoredTokens = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEYS.tokens);
    window.localStorage.removeItem('accessToken');
};

// Стартует авторизацию через Keycloak.
export const startKeycloakLogin = async () => {
    if (typeof window === 'undefined') return;

    if (!window.crypto?.subtle) {
        throw new Error('Браузер не поддерживает PKCE.');
    }

    const config = getKeycloakConfig();
    const verifier = createRandomString(64);
    const state = createRandomString(16);
    const challenge = await createPkceChallenge(verifier);

    window.sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, verifier);
    window.sessionStorage.setItem(STORAGE_KEYS.pkceState, state);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: getRedirectUri(),
        scope: config.scope,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const authUrl = `${baseUrl}/realms/${config.realm}/protocol/openid-connect/auth?${params.toString()}`;
    window.location.assign(authUrl);
};

// Обменивает код на токены.
export const exchangeCodeForTokens = async ({code, state}) => {
    if (!code) {
        throw new Error('Код авторизации не найден.');
    }

    const config = getKeycloakConfig();
    const savedState = window.sessionStorage.getItem(STORAGE_KEYS.pkceState);
    const verifier = window.sessionStorage.getItem(STORAGE_KEYS.pkceVerifier);

    if (!verifier) {
        throw new Error('Не найден verifier для PKCE.');
    }
    if (savedState && state && savedState !== state) {
        throw new Error('Некорректный параметр state.');
    }

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: verifier,
    });

    const tokenUrl = `${config.baseUrl.replace(/\/$/, '')}/realms/${config.realm}/protocol/openid-connect/token`;
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Не удалось получить токены.');
    }

    const data = await response.json();
    window.sessionStorage.removeItem(STORAGE_KEYS.pkceState);
    window.sessionStorage.removeItem(STORAGE_KEYS.pkceVerifier);
    return data;
};
