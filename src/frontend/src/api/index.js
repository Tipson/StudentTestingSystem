import {assessmentApi} from './assessment.js';

// Single entry point for all API modules.
export const api = {
    assessment: assessmentApi,
};

export {assessmentApi} from './assessment.js';
export {apiClient} from './client.js';
export {AUTH} from './auth.js';
export default api;
