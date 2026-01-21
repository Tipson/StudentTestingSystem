// Базовые URL разных сервисов
// Приоритет: 1) Runtime config (window._env_), 2) Build-time env, 3) Fallback
const getRuntimeEnv = (key) => {
    return window._env_?.[key] || process.env[key];
};

export const API_BASE_URLS = Object.freeze({
    assessment:
        getRuntimeEnv('REACT_APP_API_ASSESSMENT_URL')
        || getRuntimeEnv('REACT_APP_API_URL_ASSESSMENT')
        || getRuntimeEnv('REACT_APP_API_URL'),
    media:
        getRuntimeEnv('REACT_APP_API_MEDIA_URL')
        || getRuntimeEnv('REACT_APP_API_URL_MEDIA')
        || getRuntimeEnv('REACT_APP_API_URL'),
    ai:
        getRuntimeEnv('REACT_APP_API_AI_URL')
        || getRuntimeEnv('REACT_APP_API_URL_AI')
        || getRuntimeEnv('REACT_APP_API_ASSESSMENT_URL')
        || getRuntimeEnv('REACT_APP_API_URL_ASSESSMENT')
        || getRuntimeEnv('REACT_APP_API_URL'),
    identify:
        getRuntimeEnv('REACT_APP_API_IDENTIFY_URL')
        || getRuntimeEnv('REACT_APP_API_URL_IDENTIFY')
        || getRuntimeEnv('REACT_APP_API_URL'),
});

// Помогает получать URL по ключу сервиса и не падать при неизвестном ключе.
export const getApiBaseUrl = (service) => API_BASE_URLS[service] ?? API_BASE_URLS.assessment;
