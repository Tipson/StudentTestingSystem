// Нормализуем список клиентов сессии для отображения.
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

// Подбираем человекочитаемую подпись для credential.
export const resolveCredentialLabel = (credential) => {
    if (!credential) return 'Учётные данные';
    if (credential.userLabel) return credential.userLabel;
    const type = credential.type || credential.credentialType || '';
    if (type === 'password') return 'Пароль';
    if (type === 'otp') return 'OTP';
    if (type === 'webauthn') return 'WebAuthn';
    return type || 'Учётные данные';
};

// Достаём секрет и QR для OTP из разных версий ответа Keycloak.
export const resolveOtpSecret = (data) => (
    data?.totpSecret
    || data?.totpSecretEncoded
    || data?.secret
    || data?.secretEncoded
    || data?.totp?.totpSecret
    || data?.totp?.totpSecretEncoded
    || ''
);

export const resolveOtpQrSource = (data) => (
    data?.qrCode
    || data?.qrCodeUrl
    || data?.qrUrl
    || data?.totpSecretQrCode
    || data?.totp?.qrCode
    || data?.totp?.qrUrl
    || ''
);

export const normalizeOtpQrSource = (value) => {
    if (!value) return '';
    if (/^data:image/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return `data:image/png;base64,${value}`;
};

export const buildAccountProfilePayload = (form) => {
    const payload = {};
    if (form.username) payload.username = form.username;
    if (form.email) payload.email = form.email;
    if (form.firstName) payload.firstName = form.firstName;
    if (form.lastName) payload.lastName = form.lastName;
    return payload;
};
