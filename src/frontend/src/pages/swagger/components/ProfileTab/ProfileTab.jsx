import React, {useMemo} from 'react';
import {
    formatDateTime,
    normalizeSessionClients,
    resolveCredentialLabel,
    normalizeOtpQrSource,
    resolveOtpSecret,
    resolveOtpQrSource,
} from '../../utils/index.js';
import {USER_SOURCE_LABELS} from '../../constants/index.js';

export default function ProfileTab({
    profile,
    roles,
    source,
    hasToken,
    tokens,
    keycloakAccountUrl,
    keycloakSecurityUrl,
    // Профиль Keycloak
    accountProfile,
    accountProfileLoading,
    accountProfileError,
    profileForm,
    profileDirty,
    profileSaving,
    onProfileChange,
    onProfileSave,
    onProfileReset,
    onProfileRefresh,
    // Безопасность
    accountSecurityLoading,
    accountSecurityError,
    accountSessions,
    accountCredentials,
    onSecurityRefresh,
    onLogoutSession,
    onLogoutAllSessions,
    onRemoveCredential,
    // OTP
    otpData,
    otpLoading,
    otpError,
    otpForm,
    otpSaving,
    onOtpChange,
    onOtpLoad,
    onOtpSave,
    onOtpReset,
    // Токены
    tokenLabel,
    tokenPreview,
    tokenExpiresAt,
    onLogin,
    onLogout,
    onRefreshToken,
    onCopyToken,
}) {
    const profileRows = useMemo(() => ([
        {label: 'ID', value: profile?.id},
        {label: 'Логин', value: profile?.username},
        {label: 'Email', value: profile?.email},
        {label: 'Имя', value: profile?.name},
        {label: 'Фамилия', value: profile?.familyName},
        {label: 'Источник', value: USER_SOURCE_LABELS[source] || source},
    ]), [profile, source]);

    const sortedRoles = useMemo(() => (
        Array.isArray(roles) ? roles.slice().sort((a, b) => a.localeCompare(b)) : []
    ), [roles]);

    const otpSecret = useMemo(() => resolveOtpSecret(otpData), [otpData]);
    const otpQrSource = useMemo(
        () => normalizeOtpQrSource(resolveOtpQrSource(otpData)),
        [otpData],
    );
    const otpPolicy = useMemo(
        () => otpData?.policy || otpData?.totp?.policy || null,
        [otpData],
    );
    const otpApps = useMemo(() => {
        const apps = otpData?.supportedApplications || otpData?.totp?.supportedApplications || [];
        return Array.isArray(apps) ? apps : [];
    }, [otpData]);
    const otpAppNames = useMemo(() => (
        otpApps
            .map((app) => {
                if (typeof app === 'string') return app;
                return app?.name || app?.displayName || app?.label || app?.id || '';
            })
            .filter(Boolean)
    ), [otpApps]);
    const otpPolicyText = useMemo(() => {
        if (!otpPolicy) return '';
        const parts = [];
        if (otpPolicy.type) parts.push(`Тип: ${otpPolicy.type}`);
        if (otpPolicy.algorithm || otpPolicy.algorithmKey) {
            parts.push(`Алгоритм: ${otpPolicy.algorithm || otpPolicy.algorithmKey}`);
        }
        if (otpPolicy.digits) parts.push(`Цифры: ${otpPolicy.digits}`);
        if (otpPolicy.period) parts.push(`Интервал: ${otpPolicy.period}`);
        if (otpPolicy.initialCounter) parts.push(`Счётчик: ${otpPolicy.initialCounter}`);
        return parts.join(' | ');
    }, [otpPolicy]);
    const otpCredentialsCount = useMemo(() => (
        Array.isArray(accountCredentials)
            ? accountCredentials.filter((cred) => (
                (cred?.type || cred?.credentialType) === 'otp'
            )).length
            : 0
    ), [accountCredentials]);

    const handleProfileChange = (field) => (e) => {
        onProfileChange(field, e.target.value);
    };

    const handleOtpChange = (field) => (e) => {
        onOtpChange(field, e.target.value);
    };

    return (
        <section className="swagger-panel-grid">
            <div className="swagger-panel">
                <div className="swagger-profile-header">
                    <h2>Токен авторизации</h2>
                    <div className="swagger-profile-actions">
                        {hasToken ? (
                            <>
                                <button
                                    className="swagger-button secondary"
                                    type="button"
                                    onClick={onRefreshToken}
                                >
                                    Обновить
                                </button>
                                <button
                                    className="swagger-button ghost"
                                    type="button"
                                    onClick={onCopyToken}
                                >
                                    Копировать
                                </button>
                                <button
                                    className="swagger-button ghost"
                                    type="button"
                                    onClick={onLogout}
                                >
                                    Выйти
                                </button>
                            </>
                        ) : (
                            <button
                                className="swagger-button"
                                type="button"
                                onClick={onLogin}
                            >
                                Войти через Keycloak
                            </button>
                        )}
                    </div>
                </div>
                <p className="swagger-subtitle">{tokenLabel}</p>
                {tokenPreview && <code className="swagger-token-preview">{tokenPreview}</code>}
                {tokenExpiresAt && (
                    <p className="swagger-subtitle">Истекает: {tokenExpiresAt}</p>
                )}
            </div>

            <div className="swagger-panel">
                <div className="swagger-profile-header">
                    <h2>Профиль</h2>
                    {keycloakAccountUrl && (
                        <a
                            className="swagger-button ghost"
                            href={keycloakAccountUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Открыть Keycloak
                        </a>
                    )}
                </div>
                <div className="swagger-profile-table">
                    {profileRows.map((row) => (
                        <div key={row.label} className="swagger-profile-row">
                            <span className="swagger-profile-label">{row.label}</span>
                            <span className="swagger-profile-value">{row.value || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="swagger-panel">
                <div className="swagger-profile-header">
                    <h2>Профиль Keycloak</h2>
                    <div className="swagger-profile-actions">
                        <button
                            className="swagger-button secondary"
                            type="button"
                            onClick={onProfileRefresh}
                            disabled={accountProfileLoading || !hasToken}
                        >
                            {accountProfileLoading ? '...' : 'Обновить'}
                        </button>
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={onProfileReset}
                            disabled={!profileDirty}
                        >
                            Сбросить
                        </button>
                    </div>
                </div>
                {accountProfileError && (
                    <p className="swagger-subtitle swagger-error">{accountProfileError}</p>
                )}
                {!hasToken && (
                    <p className="swagger-subtitle">Авторизуйтесь, чтобы редактировать профиль.</p>
                )}
                {accountProfileLoading && hasToken && (
                    <p className="swagger-subtitle swagger-loading">Загружаем профиль Keycloak...</p>
                )}
                <div className="swagger-form-grid">
                    <div className="swagger-field">
                        <label htmlFor="profile-username">Логин</label>
                        <input
                            id="profile-username"
                            className="swagger-input"
                            type="text"
                            value={profileForm.username}
                            onChange={handleProfileChange('username')}
                            disabled={!hasToken || profileSaving}
                        />
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="profile-email">Email</label>
                        <input
                            id="profile-email"
                            className="swagger-input"
                            type="email"
                            value={profileForm.email}
                            onChange={handleProfileChange('email')}
                            disabled={!hasToken || profileSaving}
                        />
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="profile-first-name">Имя</label>
                        <input
                            id="profile-first-name"
                            className="swagger-input"
                            type="text"
                            value={profileForm.firstName}
                            onChange={handleProfileChange('firstName')}
                            disabled={!hasToken || profileSaving}
                        />
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="profile-last-name">Фамилия</label>
                        <input
                            id="profile-last-name"
                            className="swagger-input"
                            type="text"
                            value={profileForm.lastName}
                            onChange={handleProfileChange('lastName')}
                            disabled={!hasToken || profileSaving}
                        />
                    </div>
                </div>
                <div className="swagger-form-actions">
                    <button
                        className="swagger-button"
                        type="button"
                        onClick={onProfileSave}
                        disabled={!hasToken || profileSaving || !profileDirty}
                    >
                        {profileSaving ? '...' : 'Сохранить профиль'}
                    </button>
                    {profileDirty && (
                        <span className="swagger-hint">Есть несохранённые изменения.</span>
                    )}
                </div>
            </div>

            <div className="swagger-panel">
                <div className="swagger-profile-header">
                    <h2>Безопасность Keycloak</h2>
                    <div className="swagger-profile-actions">
                        <button
                            className="swagger-button secondary"
                            type="button"
                            onClick={onSecurityRefresh}
                            disabled={accountSecurityLoading || !hasToken}
                        >
                            {accountSecurityLoading ? '...' : 'Обновить'}
                        </button>
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={onLogoutAllSessions}
                            disabled={accountSecurityLoading || !hasToken || !accountSessions.length}
                        >
                            Завершить все сессии
                        </button>
                    </div>
                </div>
                {accountSecurityError && (
                    <p className="swagger-subtitle swagger-error">{accountSecurityError}</p>
                )}
                {!hasToken && (
                    <p className="swagger-subtitle">Авторизуйтесь, чтобы видеть безопасность.</p>
                )}
                {accountSecurityLoading && hasToken && (
                    <p className="swagger-subtitle swagger-loading">Загружаем безопасность Keycloak...</p>
                )}
                <div className="swagger-security-grid">
                    <div className="swagger-security-block">
                        <h3>Сессии</h3>
                        {accountSessions.length ? (
                            <div className="swagger-security-list">
                                {accountSessions.map((session, index) => {
                                    const sessionId = session?.id || session?.sessionId || session?.session || session?.uuid || '';
                                    const sessionClients = normalizeSessionClients(session?.clients);
                                    const startedAt = formatDateTime(
                                        session?.started || session?.start || session?.createdTimestamp,
                                    );
                                    const lastAccessAt = formatDateTime(
                                        session?.lastAccess || session?.lastAccessTime || session?.lastAccessed,
                                    );
                                    const sessionMeta = [
                                        session?.ipAddress || session?.ip
                                            ? `IP: ${session.ipAddress || session.ip}`
                                            : '',
                                        startedAt ? `Старт: ${startedAt}` : '',
                                        lastAccessAt ? `Последний доступ: ${lastAccessAt}` : '',
                                    ].filter(Boolean).join(' | ');

                                    return (
                                        <div key={sessionId || index} className="swagger-security-item">
                                            <div className="swagger-security-title">
                                                Сессия {index + 1}
                                            </div>
                                            {sessionMeta && (
                                                <div className="swagger-security-meta">{sessionMeta}</div>
                                            )}
                                            {sessionClients.length > 0 && (
                                                <div className="swagger-security-tags">
                                                    {sessionClients.map((client) => (
                                                        <span
                                                            key={`${sessionId || index}-${client}`}
                                                            className="swagger-security-tag"
                                                        >
                                                            {client}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="swagger-security-actions">
                                                <button
                                                    className="swagger-button ghost"
                                                    type="button"
                                                    onClick={() => onLogoutSession(sessionId)}
                                                    disabled={accountSecurityLoading || !sessionId}
                                                >
                                                    Завершить
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="swagger-subtitle">Нет активных сессий.</p>
                        )}
                    </div>
                    <div className="swagger-security-block">
                        <h3>Учётные данные</h3>
                        {accountCredentials.length ? (
                            <div className="swagger-security-list">
                                {accountCredentials.map((credential, index) => {
                                    const credentialId = credential?.id || credential?.credentialId || '';
                                    const credentialType = credential?.type || credential?.credentialType || '';
                                    const credentialLabel = resolveCredentialLabel(credential);
                                    const createdAt = formatDateTime(
                                        credential?.createdDate ?? credential?.createdTimestamp,
                                    );
                                    const canRemove = credential?.removable ?? credential?.removableByUser
                                        ?? (credentialType && credentialType !== 'password');

                                    return (
                                        <div key={credentialId || index} className="swagger-security-item">
                                            <div className="swagger-security-title">{credentialLabel}</div>
                                            <div className="swagger-security-meta">
                                                {credentialType && `Тип: ${credentialType}`}
                                                {createdAt && ` | Создано: ${createdAt}`}
                                            </div>
                                            {credentialId && (
                                                <div className="swagger-security-meta">ID: {credentialId}</div>
                                            )}
                                            {canRemove && (
                                                <div className="swagger-security-actions">
                                                    <button
                                                        className="swagger-button ghost"
                                                        type="button"
                                                        onClick={() => onRemoveCredential(credentialId)}
                                                        disabled={accountSecurityLoading || !credentialId}
                                                    >
                                                        Удалить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="swagger-subtitle">Нет дополнительных учётных данных.</p>
                        )}
                    </div>
                </div>
                <div className="swagger-security-block swagger-security-stack">
                    <div className="swagger-profile-header">
                        <h3>OTP</h3>
                        <div className="swagger-profile-actions">
                            <button
                                className="swagger-button secondary"
                                type="button"
                                onClick={onOtpLoad}
                                disabled={!hasToken || otpLoading}
                            >
                                {otpLoading ? '...' : 'Получить QR'}
                            </button>
                            <button
                                className="swagger-button ghost"
                                type="button"
                                onClick={onOtpReset}
                                disabled={!otpData && !otpForm.code}
                            >
                                Сбросить
                            </button>
                            {keycloakSecurityUrl && (
                                <a
                                    className="swagger-button ghost"
                                    href={keycloakSecurityUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Открыть в Keycloak
                                </a>
                            )}
                        </div>
                    </div>
                    {otpCredentialsCount > 0 && (
                        <p className="swagger-subtitle">Подключено OTP: {otpCredentialsCount}</p>
                    )}
                    {otpError && (
                        <p className="swagger-subtitle swagger-error">{otpError}</p>
                    )}
                    {otpLoading && (
                        <p className="swagger-subtitle swagger-loading">Получаем данные для OTP...</p>
                    )}
                    {otpData ? (
                        <>
                            <div className="swagger-otp-grid">
                                <div className="swagger-otp-qr">
                                    {otpQrSource ? (
                                        <img
                                            src={otpQrSource}
                                            alt="QR для OTP"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="swagger-otp-placeholder">QR недоступен</div>
                                    )}
                                </div>
                                <div className="swagger-otp-details">
                                    <div className="swagger-otp-meta">
                                        Отсканируйте QR или введите секрет вручную.
                                    </div>
                                    {otpSecret && (
                                        <code className="swagger-otp-code">{otpSecret}</code>
                                    )}
                                    {otpPolicyText && (
                                        <div className="swagger-otp-meta">{otpPolicyText}</div>
                                    )}
                                    {otpAppNames.length > 0 && (
                                        <div className="swagger-otp-apps">
                                            {otpAppNames.map((name) => (
                                                <span key={name} className="swagger-security-tag">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="swagger-form-grid">
                                <div className="swagger-field">
                                    <label htmlFor="otp-device">Название устройства</label>
                                    <input
                                        id="otp-device"
                                        className="swagger-input"
                                        type="text"
                                        value={otpForm.deviceName}
                                        onChange={handleOtpChange('deviceName')}
                                        disabled={!hasToken || otpSaving}
                                    />
                                </div>
                                <div className="swagger-field">
                                    <label htmlFor="otp-code">Код из приложения</label>
                                    <input
                                        id="otp-code"
                                        className="swagger-input"
                                        type="text"
                                        value={otpForm.code}
                                        onChange={handleOtpChange('code')}
                                        disabled={!hasToken || otpSaving}
                                    />
                                </div>
                            </div>
                            <div className="swagger-form-actions">
                                <button
                                    className="swagger-button"
                                    type="button"
                                    onClick={onOtpSave}
                                    disabled={!hasToken || otpSaving}
                                >
                                    {otpSaving ? '...' : 'Подключить OTP'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="swagger-subtitle">
                            Нажмите "Получить QR", чтобы подключить одноразовый пароль.
                        </p>
                    )}
                </div>
            </div>

            <div className="swagger-panel">
                <div className="swagger-profile-header">
                    <h2>Роли</h2>
                    {sortedRoles.length > 0 && (
                        <span className="swagger-hint">Всего: {sortedRoles.length}</span>
                    )}
                </div>
                {sortedRoles.length ? (
                    <div className="swagger-role-list">
                        {sortedRoles.map((role) => (
                            <span key={role} className="swagger-role-pill">{role}</span>
                        ))}
                    </div>
                ) : (
                    <p className="swagger-subtitle">Роли не найдены.</p>
                )}
            </div>
        </section>
    );
}
