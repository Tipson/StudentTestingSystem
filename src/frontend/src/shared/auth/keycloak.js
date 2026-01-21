const STORAGE_KEYS = {
    tokens: 'swagger:tokens',
    pkceVerifier: 'swagger:pkce_verifier',
    pkceState: 'swagger:pkce_state',
    pkceTimestamp: 'swagger:pkce_created_at',
};

const DEFAULT_CONFIG = {
    baseUrl: 'http://keycloak.oleg.agentik007.ru',
    realm: 'lms',
    clientId: 'swagger',
    scope: 'openid profile email',
    redirectPath: '/swagger/oauth2-redirect.html',
};

const PKCE_STORAGE_TTL_MS = 10 * 60_000;

const DEFAULT_REFRESH_CONFIG = {
    intervalMs: 60_000,
    leewayMs: 120_000,
};

const parseEnvMs = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

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

export const getKeycloakRefreshConfig = () => {
    const env = process.env;
    return {
        intervalMs: parseEnvMs(env.REACT_APP_KEYCLOAK_REFRESH_INTERVAL_MS, DEFAULT_REFRESH_CONFIG.intervalMs),
        leewayMs: parseEnvMs(env.REACT_APP_KEYCLOAK_REFRESH_LEEWAY_MS, DEFAULT_REFRESH_CONFIG.leewayMs),
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

const persistPkceState = ({verifier, state}) => {
    if (typeof window === 'undefined') return;
    const timestamp = Date.now();

    window.sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, verifier);
    window.sessionStorage.setItem(STORAGE_KEYS.pkceState, state);
    window.localStorage.setItem(STORAGE_KEYS.pkceVerifier, verifier);
    window.localStorage.setItem(STORAGE_KEYS.pkceState, state);
    window.localStorage.setItem(STORAGE_KEYS.pkceTimestamp, String(timestamp));
};

const clearPkceState = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(STORAGE_KEYS.pkceState);
    window.sessionStorage.removeItem(STORAGE_KEYS.pkceVerifier);
    window.localStorage.removeItem(STORAGE_KEYS.pkceState);
    window.localStorage.removeItem(STORAGE_KEYS.pkceVerifier);
    window.localStorage.removeItem(STORAGE_KEYS.pkceTimestamp);
};

const readPkceState = () => {
    if (typeof window === 'undefined') return {state: null, verifier: null};

    const sessionState = window.sessionStorage.getItem(STORAGE_KEYS.pkceState);
    const sessionVerifier = window.sessionStorage.getItem(STORAGE_KEYS.pkceVerifier);

    if (sessionVerifier) {
        return {state: sessionState, verifier: sessionVerifier};
    }

    const storedVerifier = window.localStorage.getItem(STORAGE_KEYS.pkceVerifier);
    if (!storedVerifier) {
        return {state: null, verifier: null};
    }

    const storedState = window.localStorage.getItem(STORAGE_KEYS.pkceState);
    const storedTimestamp = Number(window.localStorage.getItem(STORAGE_KEYS.pkceTimestamp));

    if (!Number.isFinite(storedTimestamp) || Date.now() - storedTimestamp > PKCE_STORAGE_TTL_MS) {
        clearPkceState();
        return {state: null, verifier: null};
    }

    window.sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, storedVerifier);
    if (storedState) {
        window.sessionStorage.setItem(STORAGE_KEYS.pkceState, storedState);
    }

    return {state: storedState, verifier: storedVerifier};
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

    const storedTokens = getStoredTokens();
    const refreshToken = tokenResponse.refresh_token || storedTokens?.refreshToken || '';
    const refreshExpiresAt = tokenResponse.refresh_expires_in
        ? Date.now() + tokenResponse.refresh_expires_in * 1000
        : (storedTokens?.refreshExpiresAt ?? null);

    const payload = {
        accessToken: tokenResponse.access_token || '',
        refreshToken,
        idToken: tokenResponse.id_token || '',
        expiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
        refreshExpiresAt,
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

    persistPkceState({verifier, state});

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

export const refreshKeycloakTokens = async (refreshToken) => {
    if (!refreshToken) {
        throw new Error('РќРµ РЅР°Р№РґРµРЅ refresh_token.');
    }

    const config = getKeycloakConfig();
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: refreshToken,
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
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();
        const message = typeof payload === 'string'
            ? payload
            : payload?.error_description || payload?.error || payload?.message;

        const error = new Error(message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ С‚РѕРєРµРЅС‹.');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return response.json();
};

export const exchangeCodeForTokens = async ({code, state}) => {
    if (!code) {
        throw new Error('Код авторизации не найден.');
    }

    const config = getKeycloakConfig();
    const {state: savedState, verifier} = readPkceState();

    if (!verifier) {
        const error = new Error('Не найден verifier для PKCE.');
        error.code = 'PKCE_VERIFIER_MISSING';
        throw error;
    }
    if (savedState && state && savedState !== state) {
        const error = new Error('Некорректный параметр state.');
        error.code = 'PKCE_STATE_MISMATCH';
        clearPkceState();
        throw error;
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
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();
        const message = typeof payload === 'string'
            ? payload
            : payload?.error_description || payload?.error || payload?.message;

        throw new Error(message || 'Не удалось получить токены.');
    }

    const data = await response.json();
    clearPkceState();
    return data;
};
