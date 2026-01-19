// Флаги авторизации для запросов: OPTIONAL, TRUE (обязательно) или FALSE (пропустить).
export const AUTH = Object.freeze({
    OPTIONAL: 'optional',
    TRUE: 'true',
    FALSE: 'false',
});

// Временный getter токена, пока нет отдельного auth-модуля.
export const getAccessToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.localStorage.getItem('accessToken');
};