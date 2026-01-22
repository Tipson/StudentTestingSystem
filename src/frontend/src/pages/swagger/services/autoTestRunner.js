/**
 * Сервис запуска автотестов
 * Отвечает за выполнение автоматизированных API-тестов
 *
 * ВАЖНО: HTTP методы должны соответствовать определениям в src/frontend/src/api/
 * - publish/unpublish: PUT
 * - удаление вопросов: DELETE /api/questions/{id}
 * - ответы: PUT /api/attempts/{attemptId}/answers/{questionId}
 * - переупорядочивание: PUT /api/tests/{testId}/questions/reorder
 *
 * Схема ответа на вопрос:
 * {
 *   "optionId": "uuid",      // для SingleChoice/TrueFalse
 *   "optionIds": ["uuid"],   // для MultipleChoice
 *   "text": "string"         // для текстовых ответов
 * }
 */
import {apiClients} from '@api/client.js';
import {getAccessToken} from '@api/auth.js';

import {
    QUESTION_TYPES,
    AUTO_TEST_RETRY_LIMIT,
    AUTO_TEST_RETRY_DELAY_MS,
    buildAutoTestQuestions,
} from '../constants/index.js';

import {
    runStepWithRetries,
    createSampleImageFile,
    buildQuestionPayload,
    buildQuestionRecord,
    buildAnswerPayload,
    getQuestionId,
} from '../utils/index.js';

/**
 * Запуск набора автотестов
 *
 * @param {Object} options
 * @param {Function} options.onResult - Колбэк для каждого результата шага
 * @param {Object} options.stopRef - Ref с полем .current (boolean), чтобы сигнализировать остановку
 * @returns {Promise<void>}
 */
export async function runAutoTestsSuite({onResult, stopRef}) {
    const token = await getAccessToken();
    const headers = token ? {Authorization: `Bearer ${token}`} : undefined;

    const assessmentClient = apiClients.assessment;
    const mediaClient = apiClients.media;
    const aiClient = apiClients.ai;

    let testId = null;
    let attemptId = null;
    const questionIds = [];
    const questionRecords = [];

    // Хелпер: отправить результат шага наружу
    const push = (result) => {
        if (stopRef?.current) return;
        onResult?.(result);
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

    // ========================================================================
    // Health-check
    // ========================================================================
    await runStep({
        id: 'health-assessment',
        client: assessmentClient,
        method: 'GET',
        path: '/healthz',
        expectedStatuses: [200],
        message: 'Проверка здоровья Assessment',
    });

    await runStep({
        id: 'health-media',
        client: mediaClient,
        method: 'GET',
        path: '/healthz',
        expectedStatuses: [200],
        message: 'Проверка здоровья Media',
    });

    // ========================================================================
    // Создание и настройка теста
    // ========================================================================

    // Создание теста
    const createTestResult = await runStep({
        id: 'create-test',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `AutoTest ${Date.now()}`,
            description: 'Автоматически созданный тест',
            durationMinutes: 30,
            maxAttempts: 3,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });

    testId = createTestResult?.responseData?.id;

    if (!testId) {
        push({
            id: 'test-id-missing',
            status: 'failed',
            method: 'POST',
            path: '/api/tests',
            message: 'Не удалось получить ID теста',
        });
        throw new Error('Test ID missing');
    }

    // Получение теста
    await runStep({
        id: 'get-test',
        client: assessmentClient,
        method: 'GET',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200],
        message: 'Получение теста',
    });

    // Обновление теста
    await runStep({
        id: 'update-test',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}`,
        data: {
            title: `AutoTest Updated ${Date.now()}`,
            description: 'Обновлённое описание теста',
            durationMinutes: 45,
            maxAttempts: 5,
        },
        expectedStatuses: [200, 204],
        message: 'Обновление теста',
    });

    // ========================================================================
    // Создание вопросов
    // ========================================================================
    const questions = buildAutoTestQuestions(testId);

    for (const q of questions) {
        if (stopRef?.current) break;

        const payload = buildQuestionPayload(q);
        const createQuestionResult = await runStep({
            id: `create-question-${q.type}`,
            client: assessmentClient,
            method: 'POST',
            path: `/api/tests/${testId}/questions`,
            data: payload,
            expectedStatuses: [201, 200],
            message: `Создание вопроса: ${q.label}`,
        });

        const questionId = getQuestionId(createQuestionResult?.responseData);
        if (questionId) {
            questionIds.push(questionId);
            // Передаём responseData для извлечения UUID опций
            questionRecords.push(buildQuestionRecord(q, questionId, createQuestionResult?.responseData));
        }
    }

    // Получение списка вопросов
    await runStep({
        id: 'get-questions',
        client: assessmentClient,
        method: 'GET',
        path: `/api/tests/${testId}/questions`,
        expectedStatuses: [200],
        message: 'Получение списка вопросов',
    });

    // Переупорядочивание вопросов (PUT /api/tests/{testId}/questions/reorder)
    if (questionIds.length >= 2) {
        await runStep({
            id: 'reorder-questions',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/tests/${testId}/questions/reorder`,
            data: [...questionIds].reverse(),
            expectedStatuses: [200, 204],
            message: 'Переупорядочивание вопросов',
        });
    }

    // ========================================================================
    // Публикация теста (PUT!)
    // ========================================================================
    await runStep({
        id: 'publish-test',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Публикация теста',
    });

    // Список всех тестов
    await runStep({
        id: 'get-all-tests',
        client: assessmentClient,
        method: 'GET',
        path: '/api/tests',
        expectedStatuses: [200],
        message: 'Список всех тестов',
    });

    // ========================================================================
    // Прохождение теста
    // ========================================================================

    // Создание попытки
    const attemptResult = await runStep({
        id: 'create-attempt',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/attempts`,
        expectedStatuses: [201, 200],
        message: 'Создание попытки',
    });

    attemptId = attemptResult?.responseData?.id;

    if (!attemptId) {
        push({
            id: 'attempt-id-missing',
            status: 'failed',
            method: 'POST',
            path: `/api/tests/${testId}/attempts`,
            message: 'Не удалось получить ID попытки',
        });
        throw new Error('Attempt ID missing');
    }

    // Получение попытки
    await runStep({
        id: 'get-attempt',
        client: assessmentClient,
        method: 'GET',
        path: `/api/attempts/${attemptId}`,
        expectedStatuses: [200],
        message: 'Получение попытки',
    });

    // Ответы на вопросы (PUT /api/attempts/{attemptId}/answers/{questionId})
    for (let i = 0; i < questionRecords.length; i++) {
        if (stopRef?.current) break;

        const record = questionRecords[i];
        // buildAnswerPayload теперь формирует правильный payload с optionId/optionIds/text
        const answerPayload = buildAnswerPayload(record);

        await runStep({
            id: `answer-question-${i}`,
            client: assessmentClient,
            method: 'PUT',
            path: `/api/attempts/${attemptId}/answers/${record.id}`,
            data: answerPayload,
            expectedStatuses: [200, 201, 204],
            message: `Ответ на вопрос: ${record.label || record.type}`,
        });
    }

    // Запрос подсказки AI (если сервис AI доступен)
    if (aiClient && questionRecords.length > 0) {
        await runStep({
            id: 'ai-hint',
            client: aiClient,
            method: 'POST',
            path: `/api/ai/attempts/${attemptId}/questions/${questionRecords[0].id}/hint`,
            expectedStatuses: [200, 201, 404, 503],
            message: 'Запрос подсказки AI',
        });
    }

    // Завершение попытки
    await runStep({
        id: 'submit-attempt',
        client: assessmentClient,
        method: 'POST',
        path: `/api/attempts/${attemptId}/submit`,
        expectedStatuses: [200, 204],
        message: 'Завершение попытки',
    });

    // Получение результата попытки
    await runStep({
        id: 'get-result',
        client: assessmentClient,
        method: 'GET',
        path: `/api/attempts/${attemptId}/result`,
        expectedStatuses: [200],
        message: 'Получение результата',
    });

    // ========================================================================
    // Дополнительные эндпоинты попыток
    // ========================================================================

    // Получить попытки по тесту
    await runStep({
        id: 'get-test-attempts',
        client: assessmentClient,
        method: 'GET',
        path: `/api/tests/${testId}/attempts`,
        expectedStatuses: [200],
        message: 'Попытки по тесту',
    });

    // Мои попытки
    await runStep({
        id: 'get-my-attempts',
        client: assessmentClient,
        method: 'GET',
        path: '/api/attempts/my',
        expectedStatuses: [200],
        message: 'Мои попытки',
    });

    // Результаты теста
    await runStep({
        id: 'get-test-results',
        client: assessmentClient,
        method: 'GET',
        path: `/api/tests/${testId}/results`,
        expectedStatuses: [200],
        message: 'Результаты теста',
    });

    // ========================================================================
    // Снятие с публикации и очистка (PUT!)
    // ========================================================================
    await runStep({
        id: 'unpublish-test',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие теста с публикации',
    });

    // Удаление вопросов (DELETE /api/questions/{id})
    for (let i = 0; i < questionIds.length; i++) {
        if (stopRef?.current) break;

        await runStep({
            id: `delete-question-${i}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${questionIds[i]}`,
            expectedStatuses: [200, 204],
            message: `Удаление вопроса ${i + 1}`,
        });
    }

    // Удаление теста
    await runStep({
        id: 'delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });

    // ========================================================================
    // Дополнительные эндпоинты тестов
    // ========================================================================
    await runStep({
        id: 'get-my-tests',
        client: assessmentClient,
        method: 'GET',
        path: '/api/tests/my',
        expectedStatuses: [200],
        message: 'Мои тесты',
    });

    // Попытки на проверку
    await runStep({
        id: 'get-pending-review',
        client: assessmentClient,
        method: 'GET',
        path: '/api/attempts/pending-review',
        expectedStatuses: [200],
        message: 'Попытки на проверку',
    });

    // ========================================================================
    // Тесты Media сервиса
    // ========================================================================
    await runStep({
        id: 'get-my-files',
        client: mediaClient,
        method: 'GET',
        path: '/api/files/my',
        expectedStatuses: [200],
        message: 'Мои файлы',
    });

    // Загрузка тестового изображения
    const sampleFile = createSampleImageFile();
    const formData = new FormData();
    formData.append('files', sampleFile);

    await runStep({
        id: 'upload-media',
        client: mediaClient,
        method: 'POST',
        path: '/api/files/upload',
        data: formData,
        expectedStatuses: [200, 201],
        message: 'Загрузка медиа',
    });
}

export default {
    runAutoTestsSuite,
};
