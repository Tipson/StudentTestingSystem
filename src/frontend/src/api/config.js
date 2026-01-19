// Базовые URL разных сервисов
const env = process.env;

export const API_BASE_URLS = Object.freeze({
    assessment:
        env.REACT_APP_API_ASSESSMENT_URL
        || env.REACT_APP_API_URL_ASSESSMENT
        || env.REACT_APP_API_URL,
    media:
        env.REACT_APP_API_MEDIA_URL
        || env.REACT_APP_API_URL_MEDIA
        || env.REACT_APP_API_URL,
    ai:
        env.REACT_APP_API_AI_URL
        || env.REACT_APP_API_URL_AI
        || env.REACT_APP_API_ASSESSMENT_URL
        || env.REACT_APP_API_URL_ASSESSMENT
        || env.REACT_APP_API_URL,
    identify:
        env.REACT_APP_API_IDENTIFY_URL
        || env.REACT_APP_API_URL_IDENTIFY
        || env.REACT_APP_API_URL,
});

// Помогает получать URL по ключу сервиса и не падать при неизвестном ключе.
export const getApiBaseUrl = (service) => API_BASE_URLS[service] ?? API_BASE_URLS.assessment;
