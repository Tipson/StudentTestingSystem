/**
 * Хук useProfile
 * Управляет профилем пользователя и состоянием аккаунта Keycloak
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { notifyCustom } from '@shared/notifications/notificationCenter.js';
import { getStoredTokens } from '@shared/auth/keycloak.js';
import {
    fetchKeycloakAccountProfile,
    fetchKeycloakCredentials,
    fetchKeycloakOtpSecret,
    fetchKeycloakSessions,
    getKeycloakAccountUrl,
    enableKeycloakOtp,
    logoutAllKeycloakSessions,
    logoutKeycloakSession,
    updateKeycloakAccountProfile,
    updateKeycloakPassword,
    deleteKeycloakCredential,
} from '@shared/auth/keycloakAccount.js';
import { buildAccountProfilePayload } from '../utils/keycloak.js';
import { formatToken } from '../utils/formatters.js';

/**
 * Хук для управления профилем и аккаунтом Keycloak
 * @returns {Object} Состояние профиля и обработчики
 */
export default function useProfile() {
    const [tokens, setTokens] = useState(() => getStoredTokens());
    const [accountProfile, setAccountProfile] = useState(null);
    const [accountProfileLoading, setAccountProfileLoading] = useState(false);
    const [accountProfileError, setAccountProfileError] = useState('');
    const [accountSecurityLoading, setAccountSecurityLoading] = useState(false);
    const [accountSecurityError, setAccountSecurityError] = useState('');
    const [accountSessions, setAccountSessions] = useState([]);
    const [accountCredentials, setAccountCredentials] = useState([]);

    const [profileForm, setProfileForm] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
    });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileDirty, setProfileDirty] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [otpData, setOtpData] = useState(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [otpForm, setOtpForm] = useState({
        code: '',
        deviceName: '',
    });
    const [otpSaving, setOtpSaving] = useState(false);

    // Ref-ы, чтобы не запускать дублирующиеся загрузки
    const profileInitRef = useRef('');
    const profileDirtyRef = useRef(false);
    const accountProfileLoadingRef = useRef(false);
    const accountSecurityLoadingRef = useRef(false);
    const profileTabLoadedRef = useRef(false);

    // Вычисляемые значения
    const hasToken = Boolean(tokens?.accessToken);
    const tokenLabel = hasToken ? 'Токен сохранен' : 'Токен не найден';
    const tokenPreview = hasToken ? formatToken(tokens.accessToken) : '';
    const tokenExpiresAt = tokens?.expiresAt
        ? new Date(tokens.expiresAt).toLocaleString('ru-RU')
        : '';

    const keycloakAccountUrl = useMemo(() => getKeycloakAccountUrl(), []);
    const keycloakSecurityUrl = useMemo(
        () => (keycloakAccountUrl ? `${keycloakAccountUrl}/#/security/signing-in` : ''),
        [keycloakAccountUrl],
    );

    // Обновить токены из хранилища
    const refreshTokens = useCallback(() => {
        setTokens(getStoredTokens());
    }, []);

    // Загрузить профиль аккаунта
    const loadAccountProfile = useCallback(async () => {
        if (accountProfileLoadingRef.current) return;

        accountProfileLoadingRef.current = true;
        setAccountProfileLoading(true);
        setAccountProfileError('');

        try {
            const data = await fetchKeycloakAccountProfile();
            setAccountProfile(data);

            // Инициализируем форму, если пользователь ещё не начал редактирование
            if (!profileDirtyRef.current) {
                const initKey = JSON.stringify({
                    username: data?.username || '',
                    email: data?.email || '',
                    firstName: data?.firstName || '',
                    lastName: data?.lastName || '',
                });

                if (profileInitRef.current !== initKey) {
                    profileInitRef.current = initKey;
                    setProfileForm({
                        username: data?.username || '',
                        email: data?.email || '',
                        firstName: data?.firstName || '',
                        lastName: data?.lastName || '',
                    });
                }
            }
        } catch (error) {
            setAccountProfileError(error.message || 'Ошибка загрузки профиля');
        } finally {
            setAccountProfileLoading(false);
            accountProfileLoadingRef.current = false;
        }
    }, []);

    // Загрузить данные безопасности (сессии, учётные данные)
    const loadSecurityInfo = useCallback(async () => {
        if (accountSecurityLoadingRef.current) return;

        accountSecurityLoadingRef.current = true;
        setAccountSecurityLoading(true);
        setAccountSecurityError('');

        try {
            const [sessions, credentials] = await Promise.all([
                fetchKeycloakSessions(),
                fetchKeycloakCredentials(),
            ]);
            setAccountSessions(sessions || []);
            setAccountCredentials(credentials || []);
        } catch (error) {
            setAccountSecurityError(error.message || 'Ошибка загрузки безопасности');
        } finally {
            setAccountSecurityLoading(false);
            accountSecurityLoadingRef.current = false;
        }
    }, []);

    // Загрузить данные для подключения OTP
    const loadOtpSetup = useCallback(async () => {
        setOtpLoading(true);
        setOtpError('');

        try {
            const data = await fetchKeycloakOtpSecret();
            setOtpData(data);
        } catch (error) {
            setOtpError(error.message || 'Ошибка получения OTP');
        } finally {
            setOtpLoading(false);
        }
    }, []);

    // Изменение полей формы профиля
    const handleProfileFormChange = useCallback((field, value) => {
        profileDirtyRef.current = true;
        setProfileDirty(true);
        setProfileForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    // Сохранение профиля
    const handleProfileSave = useCallback(async () => {
        setProfileSaving(true);

        try {
            const payload = buildAccountProfilePayload(profileForm);
            await updateKeycloakAccountProfile(payload);

            notifyCustom({ type: 'success', message: 'Профиль сохранён' });
            profileDirtyRef.current = false;
            setProfileDirty(false);

            await loadAccountProfile();
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка сохранения' });
        } finally {
            setProfileSaving(false);
        }
    }, [profileForm, loadAccountProfile]);

    // Изменение полей формы пароля
    const handlePasswordFormChange = useCallback((field, value) => {
        setPasswordForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    // Сохранение нового пароля
    const handlePasswordSave = useCallback(async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            notifyCustom({ type: 'error', message: 'Пароли не совпадают' });
            return;
        }

        setPasswordSaving(true);

        try {
            await updateKeycloakPassword(passwordForm.currentPassword, passwordForm.newPassword);
            notifyCustom({ type: 'success', message: 'Пароль изменён' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка смены пароля' });
        } finally {
            setPasswordSaving(false);
        }
    }, [passwordForm]);

    // Изменение полей формы OTP
    const handleOtpFormChange = useCallback((field, value) => {
        setOtpForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    // Включить OTP
    const handleOtpSave = useCallback(async () => {
        setOtpSaving(true);

        try {
            await enableKeycloakOtp(otpForm.code, otpForm.deviceName || 'Authenticator');
            notifyCustom({ type: 'success', message: 'OTP включён' });

            setOtpData(null);
            setOtpForm({ code: '', deviceName: '' });

            await loadSecurityInfo();
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка включения OTP' });
        } finally {
            setOtpSaving(false);
        }
    }, [otpForm, loadSecurityInfo]);

    // Завершить одну сессию
    const handleLogoutSession = useCallback(async (sessionId) => {
        try {
            await logoutKeycloakSession(sessionId);
            notifyCustom({ type: 'success', message: 'Сессия завершена' });
            await loadSecurityInfo();
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка завершения сессии' });
        }
    }, [loadSecurityInfo]);

    // Завершить все сессии
    const handleLogoutAllSessions = useCallback(async () => {
        try {
            await logoutAllKeycloakSessions();
            notifyCustom({ type: 'success', message: 'Все сессии завершены' });
            await loadSecurityInfo();
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка завершения сессий' });
        }
    }, [loadSecurityInfo]);

    // Удалить учётные данные (credential)
    const handleDeleteCredential = useCallback(async (credentialId) => {
        try {
            await deleteKeycloakCredential(credentialId);
            notifyCustom({ type: 'success', message: 'Учётные данные удалены' });
            await loadSecurityInfo();
        } catch (error) {
            notifyCustom({ type: 'error', message: error.message || 'Ошибка удаления' });
        }
    }, [loadSecurityInfo]);

    return {
        // Токены
        tokens,
        hasToken,
        tokenLabel,
        tokenPreview,
        tokenExpiresAt,
        refreshTokens,

        // Профиль аккаунта
        accountProfile,
        accountProfileLoading,
        accountProfileError,
        loadAccountProfile,

        // Безопасность
        accountSecurityLoading,
        accountSecurityError,
        accountSessions,
        accountCredentials,
        loadSecurityInfo,

        // Форма профиля
        profileForm,
        profileSaving,
        profileDirty,
        handleProfileFormChange,
        handleProfileSave,

        // Форма смены пароля
        passwordForm,
        passwordSaving,
        handlePasswordFormChange,
        handlePasswordSave,

        // OTP
        otpData,
        otpLoading,
        otpError,
        otpForm,
        otpSaving,
        loadOtpSetup,
        handleOtpFormChange,
        handleOtpSave,

        // Управление сессиями/учётными данными
        handleLogoutSession,
        handleLogoutAllSessions,
        handleDeleteCredential,

        // URL-ы
        keycloakAccountUrl,
        keycloakSecurityUrl,

        // Ref для внешнего использования
        profileTabLoadedRef,
    };
}
