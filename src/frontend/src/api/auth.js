// Auth flags passed to requests: OPTIONAL, TRUE (required), or FALSE (skip).
export const AUTH = Object.freeze({
    OPTIONAL: 'optional',
    TRUE: 'true',
    FALSE: 'false',
});

// Temporary token getter until a dedicated auth module appears.
export const getAccessToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.localStorage.getItem('accessToken');
};
