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

// Описание эндпоинтов assessment для UI.
export const assessmentApiDocs = Object.freeze([
    {service: 'assessment', group: 'Tests', method: 'POST', path: '/api/tests', description: 'Создать тест.'},
    {service: 'assessment', group: 'Tests', method: 'GET', path: '/api/tests/{id}', description: 'Получить тест по id.'},
    {service: 'assessment', group: 'Tests', method: 'GET', path: '/api/tests', description: 'Получить список тестов.'},
    {service: 'assessment', group: 'Tests', method: 'GET', path: '/api/tests/my', description: 'Получить мои тесты.'},
    {service: 'assessment', group: 'Tests', method: 'PUT', path: '/api/tests/{id}', description: 'Обновить тест.'},
    {service: 'assessment', group: 'Tests', method: 'PUT', path: '/api/tests/{id}/settings', description: 'Обновить настройки теста.'},
    {
        service: 'assessment',
        group: 'Tests',
        method: 'PUT',
        path: '/api/tests/{id}/access-type/{accessType}',
        description: 'Обновить тип доступа к тесту.',
    },
    {service: 'assessment', group: 'Tests', method: 'PUT', path: '/api/tests/{id}/availability', description: 'Обновить доступность теста.'},
    {service: 'assessment', group: 'Tests', method: 'PUT', path: '/api/tests/{id}/publish', description: 'Опубликовать тест.'},
    {service: 'assessment', group: 'Tests', method: 'PUT', path: '/api/tests/{id}/unpublish', description: 'Снять тест с публикации.'},
    {service: 'assessment', group: 'Tests', method: 'DELETE', path: '/api/tests/{id}', description: 'Удалить тест.'},
    {service: 'assessment', group: 'Tests', method: 'POST', path: '/api/tests/{testId}/access/users', description: 'Выдать доступ пользователю.'},
    {service: 'assessment', group: 'Tests', method: 'POST', path: '/api/tests/{testId}/access/groups', description: 'Выдать доступ группе.'},
    {
        service: 'assessment',
        group: 'Tests',
        method: 'POST',
        path: '/api/tests/{testId}/access/invite-links',
        description: 'Создать ссылку-приглашение.',
    },
    {service: 'assessment', group: 'Tests', method: 'GET', path: '/api/tests/{testId}/access', description: 'Получить список доступов.'},
    {service: 'assessment', group: 'Tests', method: 'DELETE', path: '/api/tests/access/{accessId}', description: 'Отозвать доступ.'},
    {
        service: 'assessment',
        group: 'Tests',
        method: 'POST',
        path: '/api/tests/join/{inviteCode}',
        description: 'Присоединиться по приглашению.',
    },
    {service: 'assessment', group: 'Questions', method: 'POST', path: '/api/tests/{testId}/questions', description: 'Создать вопрос в тесте.'},
    {service: 'assessment', group: 'Questions', method: 'GET', path: '/api/questions/{id}', description: 'Получить вопрос по id.'},
    {service: 'assessment', group: 'Questions', method: 'GET', path: '/api/tests/{testId}/questions', description: 'Получить список вопросов теста.'},
    {service: 'assessment', group: 'Questions', method: 'PUT', path: '/api/questions/{id}', description: 'Обновить вопрос.'},
    {service: 'assessment', group: 'Questions', method: 'DELETE', path: '/api/questions/{id}', description: 'Удалить вопрос.'},
    {
        service: 'assessment',
        group: 'Questions',
        method: 'PUT',
        path: '/api/tests/{testId}/questions/reorder',
        description: 'Изменить порядок вопросов в тесте.',
    },
    {service: 'assessment', group: 'Attempts', method: 'POST', path: '/api/tests/{testId}/attempts', description: 'Начать попытку.'},
    {service: 'assessment', group: 'Attempts', method: 'GET', path: '/api/tests/{testId}/attempts', description: 'Получить попытки по тесту.'},
    {service: 'assessment', group: 'Attempts', method: 'GET', path: '/api/tests/{testId}/results', description: 'Получить результаты теста.'},
    {service: 'assessment', group: 'Attempts', method: 'GET', path: '/api/attempts/{id}', description: 'Получить попытку по id.'},
    {
        service: 'assessment',
        group: 'Attempts',
        method: 'PUT',
        path: '/api/attempts/{attemptId}/answers/{questionId}',
        description: 'Сохранить ответ на вопрос.',
    },
    {service: 'assessment', group: 'Attempts', method: 'POST', path: '/api/attempts/{id}/submit', description: 'Завершить попытку.'},
    {service: 'assessment', group: 'Attempts', method: 'GET', path: '/api/attempts/{id}/result', description: 'Получить результат попытки.'},
    {service: 'assessment', group: 'Attempts', method: 'GET', path: '/api/attempts/my', description: 'Получить мои попытки.'},
    {
        service: 'assessment',
        group: 'Attempts',
        method: 'GET',
        path: '/api/attempts/pending-review',
        description: 'Получить попытки, ожидающие проверки.',
    },
    {
        service: 'assessment',
        group: 'Attempts',
        method: 'PUT',
        path: '/api/attempts/{attemptId}/answers/{questionId}/grade',
        description: 'Оценить ответ вручную.',
    },
    {
        service: 'ai',
        group: 'AI',
        method: 'POST',
        path: '/api/ai/attempts/{attemptId}/questions/{questionId}/hint',
        description: 'Получить подсказку для вопроса.',
    },
    {service: 'assessment', group: 'Health', method: 'GET', path: '/healthz', description: 'Проверка состояния сервиса.'},
]);
