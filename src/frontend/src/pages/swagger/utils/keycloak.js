/**
 * Утилиты для работы с аккаунтом Keycloak
 */

/**
 * Нормализует список клиентов сессии для отображения
 * @param {*} clients - Данные клиентов из Keycloak
 * @returns {string[]} Массив имён клиентов
 */
export const normalizeSessionClients = (clients) => {
    if (!clients) return [];
    if (Array.isArray(clients)) {
        return clients
            .map((client) => {
                if (typeof client === 'string') return client;
                return client?.clientId || client?.id || client?.name || '';
            })
            .filter(Boolean);
    }
    if (typeof clients === 'object') return Object.keys(clients);
    return [];
};

/**
 * Определяет человекочитаемую метку учётных данных
 * @param {Object} credential - Объект учётных данных
 * @returns {string} Текст метки
 */
export const resolveCredentialLabel = (credential) => {
    if (!credential) return 'Учётные данные';
    if (credential.userLabel) return credential.userLabel;
    const type = credential.type || credential.credentialType || '';
    if (type === 'password') return 'Пароль';
    if (type === 'otp') return 'OTP';
    if (type === 'webauthn') return 'WebAuthn';
    return type || 'Учётные данные';
};

/**
 * Извлекает OTP-секрет из различных форматов ответа Keycloak
 * @param {Object} data - Данные OTP от Keycloak
 * @returns {string} OTP-секрет
 */
export const resolveOtpSecret = (data) => (
    data?.totpSecret
    || data?.totpSecretEncoded
    || data?.secret
    || data?.secretEncoded
    || data?.totp?.totpSecret
    || data?.totp?.totpSecretEncoded
    || ''
);

/**
 * Извлекает источник QR-кода из данных OTP
 * @param {Object} data - Данные OTP от Keycloak
 * @returns {string} URL QR-кода или data URI
 */
export const resolveOtpQrSource = (data) => (
    data?.qrCode
    || data?.qrCodeUrl
    || data?.qrUrl
    || data?.totpSecretQrCode
    || data?.totp?.qrCode
    || data?.totp?.qrUrl
    || ''
);

/**
 * Нормализует источник QR-кода в корректный data URI
 * @param {string} value - Значение QR-кода
 * @returns {string} Нормализованный data URI
 */
export const normalizeOtpQrSource = (value) => {
    if (!value) return '';
    if (/^data:image/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return `data:image/png;base64,${value}`;
};

/**
 * Формирует payload профиля аккаунта для обновления
 * @param {Object} form - Данные формы
 * @returns {Object} Payload для API
 */
export const buildAccountProfilePayload = (form) => {
    const payload = {};
    if (form.username) payload.username = form.username;
    if (form.email) payload.email = form.email;
    if (form.firstName) payload.firstName = form.firstName;
    if (form.lastName) payload.lastName = form.lastName;
    return payload;
};
