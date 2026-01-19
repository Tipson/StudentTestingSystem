import axios from 'axios';
import {API_BASE_URLS} from './config.js';
import {applyAuthMiddleware} from './middleware.js';

// Создаёт axios-клиент с подключённым auth-мидлваром.
export const createApiClient = (baseURL) => {
    const client = axios.create({baseURL});
    applyAuthMiddleware(client);
    return client;
};

export const apiClients = Object.freeze({
    assessment: createApiClient(API_BASE_URLS.assessment),
    media: createApiClient(API_BASE_URLS.media),
    ai: createApiClient(API_BASE_URLS.ai),
    identify: createApiClient(API_BASE_URLS.identify),
});

export const assessmentClient = apiClients.assessment;
export const mediaClient = apiClients.media;
export const aiClient = apiClients.ai;
export const identifyClient = apiClients.identify;

export const apiClient = assessmentClient;
