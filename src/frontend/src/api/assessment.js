import {apiClient} from './client.js';
import {AUTH} from './auth.js';

// Helper to keep auth flags explicit but still override-able per call.
const withAuth = (config, auth) => {
    const safeConfig = config ?? {};
    return {
        ...safeConfig,
        auth: safeConfig.auth ?? auth,
    };
};

// Tests endpoints.
const tests = {
    create: (payload, config) =>
        apiClient.post('/api/tests', payload, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        apiClient.get(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
    getAll: (config) =>
        apiClient.get('/api/tests', withAuth(config, AUTH.TRUE)),
    getMy: (config) =>
        apiClient.get('/api/tests/my', withAuth(config, AUTH.TRUE)),
    update: (id, payload, config) =>
        apiClient.put(`/api/tests/${id}`, payload, withAuth(config, AUTH.TRUE)),
    updateSettings: (id, payload, config) =>
        apiClient.put(`/api/tests/${id}/settings`, payload, withAuth(config, AUTH.TRUE)),
    publish: (id, config) =>
        apiClient.put(`/api/tests/${id}/publish`, null, withAuth(config, AUTH.TRUE)),
    remove: (id, config) =>
        apiClient.delete(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
};

// Access management endpoints.
const access = {
    grantUser: (testId, payload, config) =>
        apiClient.post(`/api/tests/${testId}/access/users`, payload, withAuth(config, AUTH.TRUE)),
    grantGroup: (testId, payload, config) =>
        apiClient.post(`/api/tests/${testId}/access/groups`, payload, withAuth(config, AUTH.TRUE)),
    createInviteLink: (testId, payload, config) =>
        apiClient.post(`/api/tests/${testId}/access/invite-links`, payload, withAuth(config, AUTH.TRUE)),
    list: (testId, config) =>
        apiClient.get(`/api/tests/${testId}/access`, withAuth(config, AUTH.TRUE)),
    revoke: (accessId, config) =>
        apiClient.delete(`/api/tests/access/${accessId}`, withAuth(config, AUTH.TRUE)),
    joinByInvite: (inviteCode, config) =>
        apiClient.post(`/api/tests/join/${inviteCode}`, null, withAuth(config, AUTH.OPTIONAL)),
};

// Questions endpoints.
const questions = {
    create: (testId, payload, config) =>
        apiClient.post(`/api/tests/${testId}/questions`, payload, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        apiClient.get(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    list: (testId, config) =>
        apiClient.get(`/api/tests/${testId}/questions`, withAuth(config, AUTH.TRUE)),
    update: (id, payload, config) =>
        apiClient.put(`/api/questions/${id}`, payload, withAuth(config, AUTH.TRUE)),
    remove: (id, config) =>
        apiClient.delete(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    reorder: (testId, questionIds, config) =>
        apiClient.put(`/api/tests/${testId}/questions/reorder`, questionIds, withAuth(config, AUTH.TRUE)),
};

// Attempts endpoints.
const attempts = {
    start: (testId, config) =>
        apiClient.post(`/api/tests/${testId}/attempts`, null, withAuth(config, AUTH.TRUE)),
    listByTest: (testId, config) =>
        apiClient.get(`/api/tests/${testId}/attempts`, withAuth(config, AUTH.TRUE)),
    getResults: (testId, config) =>
        apiClient.get(`/api/tests/${testId}/results`, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        apiClient.get(`/api/attempts/${id}`, withAuth(config, AUTH.TRUE)),
    saveAnswer: (attemptId, questionId, payload, config) =>
        apiClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
    submit: (id, config) =>
        apiClient.post(`/api/attempts/${id}/submit`, null, withAuth(config, AUTH.TRUE)),
    getResult: (id, config) =>
        apiClient.get(`/api/attempts/${id}/result`, withAuth(config, AUTH.TRUE)),
    getMy: (config) =>
        apiClient.get('/api/attempts/my', withAuth(config, AUTH.TRUE)),
    gradeAnswer: (attemptId, questionId, payload, config) =>
        apiClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}/grade`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
};

// Single assessment API namespace.
export const assessmentApi = {
    tests,
    access,
    questions,
    attempts,
};
