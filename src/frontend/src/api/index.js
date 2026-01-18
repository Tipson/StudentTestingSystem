import {assessmentApi} from './assessment.js';
import {mediaApi} from './media.js';
import {identifyApi} from "@api/identity.js";

// Единая точка входа для всех API-модулей.
export const api = {
    assessment: assessmentApi,
    media: mediaApi,
    identify: identifyApi
};

export {assessmentApi} from './assessment.js';
export {mediaApi} from './media.js';
export {apiClients, assessmentClient, mediaClient, aiClient, createApiClient, apiClient} from './client.js';
export {API_BASE_URLS, getApiBaseUrl} from './config.js';
export {AUTH} from './auth.js';
export default api;
