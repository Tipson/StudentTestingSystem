import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Layout from '@shared/components/Layout/Layout.jsx';
import {getAccessToken} from '@api/auth.js';
import {fetchKeycloakAccountProfile, getKeycloakAccountUrl} from '@shared/auth/keycloakAccount.js';
import {getKeycloakConfig, TOKENS_UPDATED_EVENT} from '@shared/auth/keycloak.js';
import {useUser} from '@shared/auth/UserProvider.jsx';
import './ProfilePage.css';

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

export default function ProfilePage() {
    const {profile: cachedProfile} = useUser();
    const [accessToken, setAccessToken] = useState(() => getAccessToken(true));
    const [accountProfile, setAccountProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');

    const hasToken = Boolean(accessToken);
    const keycloakAccountUrl = useMemo(() => getKeycloakAccountUrl(), []);
    const tokenPayload = useMemo(() => decodeJwt(accessToken), [accessToken]);
    const clientId = useMemo(() => getKeycloakConfig().clientId, []);

    const keycloakRoles = useMemo(
        () => extractKeycloakRoles(tokenPayload, clientId),
        [tokenPayload, clientId],
    );

    const sortedRoles = useMemo(() => (
        Array.isArray(keycloakRoles)
            ? keycloakRoles.slice().sort((a, b) => a.localeCompare(b))
            : []
    ), [keycloakRoles]);

    const profileRows = useMemo(() => {
        const fullName = [accountProfile?.firstName, accountProfile?.lastName]
            .filter(Boolean)
            .join(' ');

        return [
            {label: 'ID', value: accountProfile?.id || tokenPayload?.sub},
            {label: 'Логин', value: accountProfile?.username || tokenPayload?.preferred_username || cachedProfile?.username},
            {label: 'Email', value: accountProfile?.email || cachedProfile?.email},
            {label: 'Имя', value: accountProfile?.firstName || cachedProfile?.name},
            {label: 'Фамилия', value: accountProfile?.lastName || cachedProfile?.familyName},
            {label: 'Полное имя', value: fullName || tokenPayload?.name},
        ];
    }, [accountProfile, tokenPayload, cachedProfile]);

    const loadAccountProfile = useCallback(async () => {
        const token = getAccessToken(true);
        if (!token) {
            setAccountProfile(null);
            setProfileError('');
            return;
        }

        setProfileLoading(true);
        setProfileError('');

        try {
            const data = await fetchKeycloakAccountProfile();
            setAccountProfile(data);
        } catch (error) {
            setProfileError(error?.message || 'Ошибка загрузки профиля Keycloak.');
        } finally {
            setProfileLoading(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleTokenUpdate = () => {
            setAccessToken(getAccessToken(true));
        };

        const handleStorage = (event) => {
            if (event.key === 'accessToken') {
                handleTokenUpdate();
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(TOKENS_UPDATED_EVENT, handleTokenUpdate);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(TOKENS_UPDATED_EVENT, handleTokenUpdate);
        };
    }, []);

    useEffect(() => {
        if (hasToken) {
            loadAccountProfile();
        }
        if (!hasToken) {
            setAccountProfile(null);
            setProfileError('');
        }
    }, [hasToken, loadAccountProfile]);

    return (
        <Layout>
            <div className="profile-page">
                <div className="profile-page__header">
                    <div>
                        <h1 className="profile-page__title">Профиль</h1>
                        <p className="profile-page__subtitle">
                            Данные Keycloak и роли доступа пользователя.
                        </p>
                    </div>
                    <div className="profile-page__actions">
                        <button
                            className="profile-button profile-button--primary"
                            type="button"
                            onClick={loadAccountProfile}
                            disabled={!hasToken || profileLoading}
                        >
                            {profileLoading ? 'Загрузка...' : 'Обновить'}
                        </button>
                        {keycloakAccountUrl && (
                            <a
                                className="profile-button profile-button--ghost"
                                href={keycloakAccountUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Открыть Keycloak
                            </a>
                        )}
                    </div>
                </div>

                {!hasToken && (
                    <div className="profile-message profile-message--warning">
                        Авторизуйтесь через Keycloak, чтобы увидеть профиль и роли.
                    </div>
                )}

                {profileError && (
                    <div className="profile-message profile-message--error">
                        {profileError}
                    </div>
                )}

                {profileLoading && hasToken && (
                    <div className="profile-message">
                        Загружаем профиль Keycloak...
                    </div>
                )}

                <div className="profile-grid">
                    <section className="profile-card">
                        <div className="profile-card__header">
                            <h2>Профиль Keycloak</h2>
                        </div>
                        <div className="profile-table">
                            {profileRows.map((row) => {
                                const hasValue = row.value !== null && row.value !== undefined && row.value !== '';
                                return (
                                    <div key={row.label} className="profile-row">
                                        <span className="profile-label">{row.label}</span>
                                        <span className={`profile-value ${!hasValue ? 'profile-value--empty' : ''}`}>
                                            {hasValue ? row.value : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="profile-card">
                        <div className="profile-card__header">
                            <h2>Роли</h2>
                            {sortedRoles.length > 0 && (
                                <span className="profile-hint">Всего: {sortedRoles.length}</span>
                            )}
                        </div>
                        {sortedRoles.length ? (
                            <div className="profile-roles">
                                {sortedRoles.map((role) => (
                                    <span key={role} className="profile-role">{role}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="profile-empty">Роли не найдены.</p>
                        )}
                    </section>
                </div>
            </div>
        </Layout>
    );
}
