import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {identifyApi} from '@api/identity.js';
import {getAccessToken} from '@api/auth.js';
import {getKeycloakConfig} from './keycloak.js';

const STORAGE_KEYS = {
    user: 'swagger:user_profile',
};

const USER_CHECK_INTERVAL_MS = 60_000;
const USER_PROFILE_REFRESH_MS = 5 * 60_000;

const readStoredUser = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.user);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
};

const persistStoredUser = (payload) => {
    if (typeof window === 'undefined') return;
    if (!payload) return;
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload));
};

const clearStoredUser = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEYS.user);
};

const decodeJwt = (token) => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const decoded = atob(padded);
        const json = decodeURIComponent(
            decoded
                .split('')
                .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join(''),
        );
        return JSON.parse(json);
    } catch (error) {
        return null;
    }
};

const extractKeycloakProfile = (payload) => {
    if (!payload) return null;
    return {
        id: payload.sub || null,
        username: payload.preferred_username || payload.username || null,
        email: payload.email || null,
        name: payload.name || payload.given_name || null,
        familyName: payload.family_name || null,
    };
};

const extractKeycloakRoles = (payload, clientId) => {
    if (!payload) return [];
    const roles = new Set();

    if (Array.isArray(payload?.realm_access?.roles)) {
        payload.realm_access.roles.forEach((role) => roles.add(role));
    }

    const resourceAccess = payload?.resource_access || {};
    if (clientId && Array.isArray(resourceAccess?.[clientId]?.roles)) {
        resourceAccess[clientId].roles.forEach((role) => roles.add(role));
    }

    Object.values(resourceAccess).forEach((entry) => {
        if (Array.isArray(entry?.roles)) {
            entry.roles.forEach((role) => roles.add(role));
        }
    });

    return Array.from(roles);
};

const extractBackendRoles = (profile) => {
    if (!profile) return [];
    const roles = [];
    if (Array.isArray(profile.roles)) roles.push(...profile.roles);
    if (Array.isArray(profile.roleNames)) roles.push(...profile.roleNames);
    if (typeof profile.role === 'string') roles.push(profile.role);
    return roles;
};

const mergeRoles = (...lists) => {
    const roles = new Set();
    lists.filter(Boolean).forEach((list) => {
        list.forEach((role) => {
            if (role) roles.add(role);
        });
    });
    return Array.from(roles);
};

const mergeProfile = (keycloakProfile, backendProfile) => {
    if (!keycloakProfile && !backendProfile) return null;
    if (!backendProfile) return keycloakProfile;
    if (!keycloakProfile) return backendProfile;

    const merged = {...keycloakProfile};
    Object.entries(backendProfile).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            merged[key] = value;
        }
    });
    return merged;
};

const DEFAULT_STATE = {
    profile: null,
    roles: [],
    source: 'none',
};

const UserContext = createContext({
    ...DEFAULT_STATE,
    refreshUser: () => Promise.resolve(),
    clearUser: () => {},
});

export const useUser = () => useContext(UserContext);

// Глобальный провайдер: тянет профиль через backend и Keycloak, сохраняет в localStorage.
export default function UserProvider({children}) {
    const stored = readStoredUser();
    const [profile, setProfile] = useState(stored?.profile ?? null);
    const [roles, setRoles] = useState(Array.isArray(stored?.roles) ? stored.roles : []);
    const [source, setSource] = useState(stored?.source ?? 'none');
    const lastTokenRef = useRef(null);
    const lastBackendSyncRef = useRef(0);
    const refreshInFlightRef = useRef(false);
    const pendingRefreshRef = useRef(false);
    const profileRef = useRef(profile);
    const rolesRef = useRef(roles);
    const sourceRef = useRef(source);

    const clearUser = useCallback(() => {
        clearStoredUser();
        setProfile(null);
        setRoles([]);
        setSource('none');
        lastTokenRef.current = null;
        lastBackendSyncRef.current = 0;
        pendingRefreshRef.current = false;
        refreshInFlightRef.current = false;
    }, []);

    const refreshUser = useCallback(async (force = false) => {
        if (refreshInFlightRef.current) {
            if (force) {
                pendingRefreshRef.current = true;
            }
            return;
        }

        const token = getAccessToken();
        if (!token) {
            clearUser();
            return;
        }

        const now = Date.now();
        const shouldFetchBackend = force
            || lastBackendSyncRef.current === 0
            || (now - lastBackendSyncRef.current > USER_PROFILE_REFRESH_MS);

        lastTokenRef.current = token;

        const payload = decodeJwt(token);
        const config = getKeycloakConfig();
        const keycloakProfile = extractKeycloakProfile(payload);
        const keycloakRoles = extractKeycloakRoles(payload, config.clientId);

        let backendProfile = null;
        let backendRoles = [];
        let hasBackendData = false;

        if (shouldFetchBackend) {
            refreshInFlightRef.current = true;
            lastBackendSyncRef.current = now;

            try {
                const response = await identifyApi.aboutMe.get();
                backendProfile = response?.data ?? null;
                backendRoles = extractBackendRoles(backendProfile);
                hasBackendData = Boolean(backendProfile);
            } catch (error) {
                // Если backend недоступен, остаёмся на данных Keycloak.
            } finally {
                refreshInFlightRef.current = false;
            }
        }

        const fallbackProfile = backendProfile || profileRef.current;
        const fallbackRoles = backendProfile ? backendRoles : rolesRef.current;
        const mergedProfile = mergeProfile(keycloakProfile, fallbackProfile);
        const mergedRoles = mergeRoles(keycloakRoles, fallbackRoles);
        const nextSource = hasBackendData
            ? 'backend+keycloak'
            : (sourceRef.current === 'backend+keycloak' || sourceRef.current === 'backend')
                ? sourceRef.current
                : (keycloakProfile ? 'keycloak' : 'none');

        const storedPayload = {
            profile: mergedProfile,
            roles: mergedRoles,
            source: nextSource,
            updatedAt: Date.now(),
        };

        persistStoredUser(storedPayload);
        setProfile(mergedProfile);
        setRoles(mergedRoles);
        setSource(nextSource);

        if (pendingRefreshRef.current) {
            pendingRefreshRef.current = false;
            refreshUser(true);
        }
    }, [clearUser]);

    useEffect(() => {
        profileRef.current = profile;
        rolesRef.current = roles;
        sourceRef.current = source;
    }, [profile, roles, source]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        refreshUser(true);

        const onStorage = (event) => {
            if (event.key === 'accessToken') {
                refreshUser(true);
            }
        };

        window.addEventListener('storage', onStorage);
        const timerId = window.setInterval(() => {
            refreshUser(false);
        }, USER_CHECK_INTERVAL_MS);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.clearInterval(timerId);
        };
    }, [refreshUser]);

    const value = useMemo(() => ({
        profile,
        roles,
        source,
        refreshUser,
        clearUser,
    }), [profile, roles, source, refreshUser, clearUser]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export const getStoredUser = () => readStoredUser();
