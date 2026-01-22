/**
 * Сервис запуска сценариев
 * Отвечает за выполнение предопределённых сценариев тестирования
 */
import { apiClients } from '@api/client.js';
import { getAccessToken } from '@api/auth.js';
import { notifyCustom } from '@shared/notifications/notificationCenter.js';

import {
    QUESTION_TYPES,
    AUTO_TEST_RETRY_LIMIT,
    AUTO_TEST_RETRY_DELAY_MS,
    SCENARIO_DEFINITIONS,
} from '../constants/index.js';

import {
    runStepWithRetries,
    getQuestionId,
} from '../utils/index.js';

/**
 * Запуск сценария «полный цикл»
 */
async function runFullCycleScenario({ runStep, push, stopRef, assessmentClient, aiClient }) {
    let testId = null;
    let attemptId = null;
    const questionIds = [];
    const questionRecords = [];

    // Создать тест
    const createResult = await runStep({
        id: 'scenario-full-create',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `Full Cycle Test ${Date.now()}`,
            description: 'Полный цикл тестирования',
            durationMinutes: 30,
            maxAttempts: 3,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });
    testId = createResult?.responseData?.id;

    // Добавить вопрос
    const questionResult = await runStep({
        id: 'scenario-full-question-1',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/questions`,
        data: {
            text: 'Тестовый вопрос',
            type: QUESTION_TYPES.SingleChoice,
            points: 1,
            options: [
                { text: 'Верно', isCorrect: true },
                { text: 'Неверно', isCorrect: false },
            ],
        },
        expectedStatuses: [201, 200],
        message: 'Добавление вопроса',
    });

    const qId = getQuestionId(questionResult?.responseData);
    if (qId) {
        questionIds.push(qId);
        questionRecords.push({ id: qId, type: 'SingleChoice' });
    }

    // Опубликовать
    await runStep({
        id: 'scenario-full-publish',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Публикация теста',
    });

    // Создать попытку
    const attemptResult = await runStep({
        id: 'scenario-full-attempt',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/attempts`,
        expectedStatuses: [201, 200],
        message: 'Создание попытки',
    });
    attemptId = attemptResult?.responseData?.id;

    // Ответить
    if (questionRecords.length > 0 && attemptId) {
        await runStep({
            id: 'scenario-full-answer-1',
            client: assessmentClient,
            method: 'POST',
            path: `/api/attempts/${attemptId}/questions/${questionRecords[0].id}/answer`,
            data: { selectedOptionIds: [0] },
            expectedStatuses: [200, 201, 204],
            message: 'Ответ на вопрос',
        });
    }

    // Подсказка AI
    if (aiClient && attemptId && questionRecords.length > 0) {
        await runStep({
            id: 'scenario-full-hint',
            client: aiClient,
            method: 'POST',
            path: `/api/ai/attempts/${attemptId}/questions/${questionRecords[0].id}/hint`,
            expectedStatuses: [200, 201, 404, 503],
            message: 'Запрос подсказки AI',
        });
    }

    // Завершить
    if (attemptId) {
        await runStep({
            id: 'scenario-full-submit',
            client: assessmentClient,
            method: 'POST',
            path: `/api/attempts/${attemptId}/submit`,
            expectedStatuses: [200, 204],
            message: 'Завершение попытки',
        });

        // Получить результат
        await runStep({
            id: 'scenario-full-result',
            client: assessmentClient,
            method: 'GET',
            path: `/api/attempts/${attemptId}/result`,
            expectedStatuses: [200],
            message: 'Получение результата',
        });
    }

    // Снять с публикации
    await runStep({
        id: 'scenario-full-unpublish',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // Удалить вопросы
    for (const qId of questionIds) {
        if (stopRef?.current) break;

        await runStep({
            id: `scenario-full-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/tests/${testId}/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // Удалить тест
    await runStep({
        id: 'scenario-full-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

/**
 * Запуск сценария «публикация без вопросов»
 */
async function runPublishWithoutQuestionsScenario({ runStep, push, stopRef, assessmentClient }) {
    let testId = null;
    const questionIds = [];

    // Создать тест
    const createResult = await runStep({
        id: 'scenario-publish-create',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `Publish Test ${Date.now()}`,
            description: 'Тест публикации без вопросов',
            durationMinutes: 30,
            maxAttempts: 1,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });
    testId = createResult?.responseData?.id;

    // Попытаться опубликовать без вопросов (ожидаем ошибку)
    await runStep({
        id: 'scenario-publish-without-questions',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [400, 422],
        message: 'Публикация без вопросов (ожидаем отказ)',
    });

    // Добавить вопрос
    const questionResult = await runStep({
        id: 'scenario-publish-question-1',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/questions`,
        data: {
            text: 'Вопрос для публикации',
            type: QUESTION_TYPES.TrueFalse,
            points: 1,
            correctAnswer: true,
        },
        expectedStatuses: [201, 200],
        message: 'Добавление вопроса',
    });

    const qId = getQuestionId(questionResult?.responseData);
    if (qId) questionIds.push(qId);

    // Успешно опубликовать
    await runStep({
        id: 'scenario-publish-success',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Успешная публикация',
    });

    // Снять с публикации
    await runStep({
        id: 'scenario-publish-unpublish',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // Удалить вопросы
    for (const qId of questionIds) {
        if (stopRef?.current) break;

        await runStep({
            id: `scenario-publish-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/tests/${testId}/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // Удалить тест
    await runStep({
        id: 'scenario-publish-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

/**
 * Запуск сценария «черновик и правки»
 */
async function runDraftFlowScenario({ runStep, push, stopRef, assessmentClient }) {
    let testId = null;
    const questionIds = [];

    // Создать тест
    const createResult = await runStep({
        id: 'scenario-draft-create',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `Draft Test ${Date.now()}`,
            description: 'Тест черновика',
            durationMinutes: 30,
            maxAttempts: 1,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });
    testId = createResult?.responseData?.id;

    // Обновить тест
    await runStep({
        id: 'scenario-draft-update',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}`,
        data: {
            title: `Draft Updated ${Date.now()}`,
            description: 'Обновлённый черновик',
            durationMinutes: 45,
            maxAttempts: 2,
        },
        expectedStatuses: [200, 204],
        message: 'Обновление теста',
    });

    // Добавить вопросы
    for (let i = 0; i < 3; i++) {
        if (stopRef?.current) break;

        const qResult = await runStep({
            id: `scenario-draft-question-${i + 1}`,
            client: assessmentClient,
            method: 'POST',
            path: `/api/tests/${testId}/questions`,
            data: {
                text: `Вопрос ${i + 1}`,
                type: QUESTION_TYPES.SingleChoice,
                points: 1,
                options: [
                    { text: 'Да', isCorrect: i === 0 },
                    { text: 'Нет', isCorrect: i !== 0 },
                ],
            },
            expectedStatuses: [201, 200],
            message: `Добавление вопроса ${i + 1}`,
        });

        const qId = getQuestionId(qResult?.responseData);
        if (qId) questionIds.push(qId);
    }

    // Переупорядочить вопросы
    if (questionIds.length >= 2) {
        await runStep({
            id: 'scenario-draft-reorder',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/tests/${testId}/questions/order`,
            data: { questionIds: [...questionIds].reverse() },
            expectedStatuses: [200, 204],
            message: 'Переупорядочивание вопросов',
        });
    }

    // Обновить первый вопрос
    if (questionIds.length > 0) {
        await runStep({
            id: 'scenario-draft-update-question',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/tests/${testId}/questions/${questionIds[0]}`,
            data: {
                text: 'Обновлённый вопрос 1',
                type: QUESTION_TYPES.SingleChoice,
                points: 2,
                options: [
                    { text: 'Обновлено Да', isCorrect: true },
                    { text: 'Обновлено Нет', isCorrect: false },
                ],
            },
            expectedStatuses: [200, 204],
            message: 'Обновление вопроса',
        });
    }

    // Удалить один вопрос
    if (questionIds.length > 1) {
        await runStep({
            id: 'scenario-draft-delete-question',
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/tests/${testId}/questions/${questionIds[1]}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // Удалить тест
    await runStep({
        id: 'scenario-draft-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

/**
 * Карта сценариев → функций запуска
 */
const SCENARIO_RUNNERS = {
    'full-cycle': runFullCycleScenario,
    'publish-without-questions': runPublishWithoutQuestionsScenario,
    'draft-flow': runDraftFlowScenario,
};

/**
 * Запуск конкретного сценария по ID
 *
 * @param {string} scenarioId - ID сценария для запуска
 * @param {Object} options
 * @param {Function} options.onResult - Колбэк для каждого результата шага
 * @param {Object} options.stopRef - Ref с полем .current (boolean), чтобы сигнализировать остановку
 * @returns {Promise<void>}
 */
export async function runScenarioById(scenarioId, { onResult, stopRef }) {
    const scenario = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);
    if (!scenario) {
        throw new Error(`Сценарий "${scenarioId}" не найден`);
    }

    const scenarioRunner = SCENARIO_RUNNERS[scenarioId];
    if (!scenarioRunner) {
        throw new Error(`Сценарий "${scenarioId}" не реализован`);
    }

    const token = await getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const assessmentClient = apiClients.assessment;
    const mediaClient = apiClients.media;
    const aiClient = apiClients.ai;

    // Хелпер: отправить результат шага наружу
    const push = (result) => {
        if (stopRef?.current) return;
        onResult?.({ ...result, scenarioId });
    };

    // Хелпер: выполнить шаг (с ретраями) и зафиксировать результат
    const runStep = async (stepConfig) => {
        if (stopRef?.current) return null;

        const result = await runStepWithRetries({
            ...stepConfig,
            headers,
            retryLimit: AUTO_TEST_RETRY_LIMIT,
            retryDelay: AUTO_TEST_RETRY_DELAY_MS,
        });

        push(result);
        return result;
    };

    await scenarioRunner({
        runStep,
        push,
        stopRef,
        assessmentClient,
        mediaClient,
        aiClient,
    });
}

export default {
    runScenarioById,
};
