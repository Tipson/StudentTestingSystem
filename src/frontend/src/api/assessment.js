import {assessmentClient, aiClient} from './client.js';
import {AUTH} from './auth.js';
import {withAuth} from '@/helpers/withAuth.js';

// Эндпоинты тестов.
const tests = {
    create: (payload, config) =>
        assessmentClient.post('/api/tests', payload, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        assessmentClient.get(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
    getAll: (config) =>
        assessmentClient.get('/api/tests', withAuth(config, AUTH.TRUE)),
    getMy: (config) =>
        assessmentClient.get('/api/tests/my', withAuth(config, AUTH.TRUE)),
    update: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}`, payload, withAuth(config, AUTH.TRUE)),
    updateSettings: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}/settings`, payload, withAuth(config, AUTH.TRUE)),
    updateAccessType: (id, accessType, config) =>
        assessmentClient.put(`/api/tests/${id}/access-type/${accessType}`, null, withAuth(config, AUTH.TRUE)),
    updateAvailability: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}/availability`, payload, withAuth(config, AUTH.TRUE)),
    publish: (id, config) =>
        assessmentClient.put(`/api/tests/${id}/publish`, null, withAuth(config, AUTH.TRUE)),
    unpublish: (id, config) =>
        assessmentClient.put(`/api/tests/${id}/unpublish`, null, withAuth(config, AUTH.TRUE)),
    remove: (id, config) =>
        assessmentClient.delete(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
};

// Эндпоинты управления доступом.
const access = {
    grantUser: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/users`, payload, withAuth(config, AUTH.TRUE)),
    grantGroup: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/groups`, payload, withAuth(config, AUTH.TRUE)),
    createInviteLink: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/invite-links`, payload, withAuth(config, AUTH.TRUE)),
    list: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/access`, withAuth(config, AUTH.TRUE)),
    revoke: (accessId, config) =>
        assessmentClient.delete(`/api/tests/access/${accessId}`, withAuth(config, AUTH.TRUE)),
    joinByInvite: (inviteCode, config) =>
        assessmentClient.post(`/api/tests/join/${inviteCode}`, null, withAuth(config, AUTH.OPTIONAL)),
};

// Эндпоинты вопросов.
const questions = {
    create: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/questions`, payload, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        assessmentClient.get(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    list: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/questions`, withAuth(config, AUTH.TRUE)),
    update: (id, payload, config) =>
        assessmentClient.put(`/api/questions/${id}`, payload, withAuth(config, AUTH.TRUE)),
    remove: (id, config) =>
        assessmentClient.delete(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    reorder: (testId, questionIds, config) =>
        assessmentClient.put(`/api/tests/${testId}/questions/reorder`, questionIds, withAuth(config, AUTH.TRUE)),
};

// Эндпоинты попыток.
const attempts = {
    start: (testId, config) =>
        assessmentClient.post(`/api/tests/${testId}/attempts`, null, withAuth(config, AUTH.TRUE)),
    listByTest: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/attempts`, withAuth(config, AUTH.TRUE)),
    getResults: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/results`, withAuth(config, AUTH.TRUE)),
    get: (id, config) =>
        assessmentClient.get(`/api/attempts/${id}`, withAuth(config, AUTH.TRUE)),
    saveAnswer: (attemptId, questionId, payload, config) =>
        assessmentClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
    submit: (id, config) =>
        assessmentClient.post(`/api/attempts/${id}/submit`, null, withAuth(config, AUTH.TRUE)),
    getResult: (id, config) =>
        assessmentClient.get(`/api/attempts/${id}/result`, withAuth(config, AUTH.TRUE)),
    getMy: (config) =>
        assessmentClient.get('/api/attempts/my', withAuth(config, AUTH.TRUE)),
    pendingReview: (config) =>
        assessmentClient.get('/api/attempts/pending-review', withAuth(config, AUTH.TRUE)),
    gradeAnswer: (attemptId, questionId, payload, config) =>
        assessmentClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}/grade`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
};

// Эндпоинты AI подсказок.
const ai = {
    hint: (attemptId, questionId, config) =>
        aiClient.post(
            `/api/ai/attempts/${attemptId}/questions/${questionId}/hint`,
            null,
            withAuth(config, AUTH.TRUE),
        ),
};

// Эндпоинты состояния сервиса.
const health = {
    check: (config) =>
        assessmentClient.get('/healthz', withAuth(config, AUTH.FALSE)),
};

// Единый namespace API для assessment.
export const assessmentApi = {
    tests,
    access,
    questions,
    attempts,
    ai,
    health,
};
