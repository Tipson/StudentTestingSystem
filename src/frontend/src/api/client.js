import axios from 'axios';
import {API_BASE_URL} from './config.js';
import {applyAuthMiddleware} from './middleware.js';

// Shared axios instance for all API modules.
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

applyAuthMiddleware(apiClient);
