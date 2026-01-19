const subscribers = new Set();
const DEFAULT_DURATION = 4000;

const TYPE_MAP = {
    success: 'success',
    warn: 'warning',
    warning: 'warning',
    info: 'info',
    error: 'error',
};

const DEFAULT_ERROR_TITLE = 'Ошибка запроса';
const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка. Попробуйте ещё раз.';

// Мини-центр уведомлений: хранит подписчиков и рассылает события.
function emit(payload) {
    subscribers.forEach((listener) => {
        try {
            listener(payload);
        } catch (err) {
            console.error('notification listener error', err);
        }
    });
}

function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `notification-${crypto.randomUUID()}`;
    }
    return `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeType(value) {
    const key = String(value || 'info').toLowerCase();
    return TYPE_MAP[key] || 'info';
}

function ensureDuration(value) {
    if (!Number.isFinite(value) || value < 0) return DEFAULT_DURATION;
    return value;
}

function extractErrorMessage(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;

    const responseData = error.response?.data;

    if (typeof responseData === 'string') return responseData;
    if (responseData?.message) return responseData.message;
    if (responseData?.error) return responseData.error;
    if (responseData?.title) return responseData.title;
    if (Array.isArray(responseData?.errors)) return responseData.errors.join(', ');

    return error.message || '';
}

// Подписка на события уведомлений.
export function subscribeNotifications(listener) {
    if (typeof listener !== 'function') return () => {};
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
}

// Показ произвольного уведомления.
export function notifyCustom(notification, options = {}) {
    const duration = ensureDuration(notification?.duration);
    const type = normalizeType(notification?.type);

    const payload = {
        id: createId(),
        key: notification?.key || 'custom',
        type,
        title: notification?.title || '',
        message: notification?.message || '',
        duration,
        timestamp: Date.now(),
    };

    if (!payload.message && !payload.title) return null;

    emit(payload, options);
    return payload.id;
}

// Удобный хелпер для отображения ошибок.
export function notifyError(error, overrides = {}) {
    const message = overrides.message
        ?? extractErrorMessage(error)
        ?? DEFAULT_ERROR_MESSAGE;

    const status = error?.response?.status;
    const title = overrides.title
        ?? (status ? `${DEFAULT_ERROR_TITLE} (${status})` : DEFAULT_ERROR_TITLE);

    return notifyCustom({
        type: 'error',
        title,
        message: message || DEFAULT_ERROR_MESSAGE,
        duration: overrides.duration ?? DEFAULT_DURATION,
    });
}