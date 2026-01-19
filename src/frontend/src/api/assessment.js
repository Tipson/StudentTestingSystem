import {assessmentClient, aiClient} from './client.js';
import {AUTH} from './auth.js';
import {withAuth} from '@/helpers/withAuth.js';

// Эндпоинты тестов.
const tests = {
    // Создать тест.
    create: (payload, config) =>
        assessmentClient.post('/api/tests', payload, withAuth(config, AUTH.TRUE)),
    // Получить тест по id.
    get: (id, config) =>
        assessmentClient.get(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
    // Получить список тестов.
    getAll: (config) =>
        assessmentClient.get('/api/tests', withAuth(config, AUTH.TRUE)),
    // Получить мои тесты.
    getMy: (config) =>
        assessmentClient.get('/api/tests/my', withAuth(config, AUTH.TRUE)),
    // Обновить тест.
    update: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}`, payload, withAuth(config, AUTH.TRUE)),
    // Обновить настройки теста.
    updateSettings: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}/settings`, payload, withAuth(config, AUTH.TRUE)),
    // Обновить тип доступа к тесту.
    updateAccessType: (id, accessType, config) =>
        assessmentClient.put(`/api/tests/${id}/access-type/${accessType}`, null, withAuth(config, AUTH.TRUE)),
    // Обновить доступность теста.
    updateAvailability: (id, payload, config) =>
        assessmentClient.put(`/api/tests/${id}/availability`, payload, withAuth(config, AUTH.TRUE)),
    // Опубликовать тест.
    publish: (id, config) =>
        assessmentClient.put(`/api/tests/${id}/publish`, null, withAuth(config, AUTH.TRUE)),
    // Снять тест с публикации.
    unpublish: (id, config) =>
        assessmentClient.put(`/api/tests/${id}/unpublish`, null, withAuth(config, AUTH.TRUE)),
    // Удалить тест.
    remove: (id, config) =>
        assessmentClient.delete(`/api/tests/${id}`, withAuth(config, AUTH.TRUE)),
};

// Эндпоинты управления доступом.
const access = {
    // Выдать доступ пользователю.
    grantUser: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/users`, payload, withAuth(config, AUTH.TRUE)),
    // Выдать доступ группе.
    grantGroup: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/groups`, payload, withAuth(config, AUTH.TRUE)),
    // Создать ссылку-приглашение.
    createInviteLink: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/access/invite-links`, payload, withAuth(config, AUTH.TRUE)),
    // Получить список доступов.
    list: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/access`, withAuth(config, AUTH.TRUE)),
    // Отозвать доступ.
    revoke: (accessId, config) =>
        assessmentClient.delete(`/api/tests/access/${accessId}`, withAuth(config, AUTH.TRUE)),
    // Присоединиться по приглашению.
    joinByInvite: (inviteCode, config) =>
        assessmentClient.post(`/api/tests/join/${inviteCode}`, null, withAuth(config, AUTH.OPTIONAL)),
};

// Эндпоинты вопросов.
const questions = {
    // Создать вопрос в тесте.
    create: (testId, payload, config) =>
        assessmentClient.post(`/api/tests/${testId}/questions`, payload, withAuth(config, AUTH.TRUE)),
    // Получить вопрос по id.
    get: (id, config) =>
        assessmentClient.get(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    // Получить список вопросов теста.
    list: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/questions`, withAuth(config, AUTH.TRUE)),
    // Обновить вопрос.
    update: (id, payload, config) =>
        assessmentClient.put(`/api/questions/${id}`, payload, withAuth(config, AUTH.TRUE)),
    // Удалить вопрос.
    remove: (id, config) =>
        assessmentClient.delete(`/api/questions/${id}`, withAuth(config, AUTH.TRUE)),
    // Изменить порядок вопросов в тесте.
    reorder: (testId, questionIds, config) =>
        assessmentClient.put(`/api/tests/${testId}/questions/reorder`, questionIds, withAuth(config, AUTH.TRUE)),
};

// Эндпоинты попыток.
const attempts = {
    // Начать попытку.
    start: (testId, config) =>
        assessmentClient.post(`/api/tests/${testId}/attempts`, null, withAuth(config, AUTH.TRUE)),
    // Получить попытки по тесту.
    listByTest: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/attempts`, withAuth(config, AUTH.TRUE)),
    // Получить результаты теста.
    getResults: (testId, config) =>
        assessmentClient.get(`/api/tests/${testId}/results`, withAuth(config, AUTH.TRUE)),
    // Получить попытку по id.
    get: (id, config) =>
        assessmentClient.get(`/api/attempts/${id}`, withAuth(config, AUTH.TRUE)),
    // Сохранить ответ на вопрос.
    saveAnswer: (attemptId, questionId, payload, config) =>
        assessmentClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
    // Завершить попытку.
    submit: (id, config) =>
        assessmentClient.post(`/api/attempts/${id}/submit`, null, withAuth(config, AUTH.TRUE)),
    // Получить результат попытки.
    getResult: (id, config) =>
        assessmentClient.get(`/api/attempts/${id}/result`, withAuth(config, AUTH.TRUE)),
    // Получить мои попытки.
    getMy: (config) =>
        assessmentClient.get('/api/attempts/my', withAuth(config, AUTH.TRUE)),
    // Получить попытки, ожидающие проверки.
    pendingReview: (config) =>
        assessmentClient.get('/api/attempts/pending-review', withAuth(config, AUTH.TRUE)),
    // Оценить ответ вручную.
    gradeAnswer: (attemptId, questionId, payload, config) =>
        assessmentClient.put(
            `/api/attempts/${attemptId}/answers/${questionId}/grade`,
            payload,
            withAuth(config, AUTH.TRUE),
        ),
};

// Эндпоинты AI подсказок.
const ai = {
    // Получить подсказку для вопроса.
    hint: (attemptId, questionId, config) =>
        aiClient.post(
            `/api/ai/attempts/${attemptId}/questions/${questionId}/hint`,
            null,
            withAuth(config, AUTH.TRUE),
        ),
};

// Эндпоинты состояния сервиса.
const health = {
    // Проверка состояния сервиса.
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
