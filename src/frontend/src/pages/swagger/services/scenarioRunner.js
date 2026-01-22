/**
 * Сервис запуска сценариев
 * Отвечает за выполнение предопределённых сценариев тестирования
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
    SCENARIO_DEFINITIONS,
} from '../constants/index.js';

import {
    runStepWithRetries,
    getQuestionId,
    extractOptionsFromResponse,
    buildAnswerPayload,
    buildIncorrectAnswerPayload,
} from '../utils/index.js';

/**
 * Хелпер для извлечения ID из ответа
 */
function extractId(responseData) {
    if (!responseData) return null;
    return responseData.id || responseData.Id || responseData.ID || null;
}

/**
 * Хелпер для извлечения ID попытки
 */
function extractAttemptId(responseData) {
    if (!responseData) return null;
    return responseData.id || responseData.attemptId || responseData.Id || null;
}

/**
 * Собирает запись вопроса с UUID опций из ответа API
 */
function buildQuestionRecordFromResponse(questionConfig, questionId, responseData) {
    const options = extractOptionsFromResponse(responseData);

    return {
        id: questionId,
        type: questionConfig.type,
        label: questionConfig.label || questionConfig.text || 'Question',
        options: options.length > 0 ? options : (questionConfig.options || []),
        correctAnswer: questionConfig.correctAnswer,
        answerText: questionConfig.answerText,
    };
}

// ============================================================================
// СЦЕНАРИЙ: Полный цикл (full-cycle)
// ============================================================================
async function runFullCycleScenario({runStep, stopRef, assessmentClient, aiClient}) {
    let testId = null;
    let attemptId = null;
    const questionIds = [];
    const questionRecords = [];

    // 1. Создать тест
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
    testId = extractId(createResult?.responseData);
    if (!testId) return;

    // 2. Добавить вопрос
    const questionConfig = {
        text: 'Тестовый вопрос',
        type: QUESTION_TYPES.SingleChoice,
        points: 1,
        options: [
            {text: 'Верно', isCorrect: true},
            {text: 'Неверно', isCorrect: false},
        ],
    };

    const questionResult = await runStep({
        id: 'scenario-full-question-1',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/questions`,
        data: questionConfig,
        expectedStatuses: [201, 200],
        message: 'Добавление вопроса',
    });

    const qId = getQuestionId(questionResult?.responseData);
    if (qId) {
        questionIds.push(qId);
        questionRecords.push(buildQuestionRecordFromResponse(questionConfig, qId, questionResult?.responseData));
    }

    // 3. Опубликовать (PUT!)
    await runStep({
        id: 'scenario-full-publish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Публикация теста',
    });

    // 4. Создать попытку
    const attemptResult = await runStep({
        id: 'scenario-full-attempt',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/attempts`,
        expectedStatuses: [201, 200],
        message: 'Создание попытки',
    });
    attemptId = extractAttemptId(attemptResult?.responseData);

    // 5. Ответить на вопрос (PUT с правильным payload)
    if (questionRecords.length > 0 && attemptId) {
        const answerPayload = buildAnswerPayload(questionRecords[0]);

        await runStep({
            id: 'scenario-full-answer-1',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/attempts/${attemptId}/answers/${questionRecords[0].id}`,
            data: answerPayload,
            expectedStatuses: [200, 201, 204],
            message: 'Ответ на вопрос',
        });
    }

    // 6. Подсказка AI
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

    // 7. Завершить попытку
    if (attemptId) {
        await runStep({
            id: 'scenario-full-submit',
            client: assessmentClient,
            method: 'POST',
            path: `/api/attempts/${attemptId}/submit`,
            expectedStatuses: [200, 204],
            message: 'Завершение попытки',
        });

        // 8. Получить результат
        await runStep({
            id: 'scenario-full-result',
            client: assessmentClient,
            method: 'GET',
            path: `/api/attempts/${attemptId}/result`,
            expectedStatuses: [200],
            message: 'Получение результата',
        });
    }

    // 9. Снять с публикации (PUT!)
    await runStep({
        id: 'scenario-full-unpublish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // 10. Удалить вопросы (DELETE /api/questions/{id})
    for (const qId of questionIds) {
        if (stopRef?.current) break;
        await runStep({
            id: `scenario-full-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // 11. Удалить тест
    await runStep({
        id: 'scenario-full-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

// ============================================================================
// СЦЕНАРИЙ: Создание теста (test-create-flow)
// ============================================================================
async function runTestCreateFlowScenario({runStep, stopRef, assessmentClient, mediaClient}) {
    let testId = null;
    const questionIds = [];
    let mediaId = null;

    // 1. Создать тест
    const createResult = await runStep({
        id: 'scenario-create-test',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `Create Flow Test ${Date.now()}`,
            description: 'Сценарий создания теста',
            durationMinutes: 45,
            maxAttempts: 5,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });
    testId = extractId(createResult?.responseData);
    if (!testId) return;

    // 2. Загрузить медиа (если есть mediaClient)
    if (mediaClient) {
        const formData = new FormData();
        const blob = new Blob(['test content'], {type: 'text/plain'});
        formData.append('files', blob, 'test-file.txt');

        const mediaResult = await runStep({
            id: 'scenario-create-media',
            client: mediaClient,
            method: 'POST',
            path: '/api/files/upload',
            data: formData,
            expectedStatuses: [200, 201, 400, 415],
            message: 'Загрузка медиа-файла',
        });
        mediaId = mediaResult?.responseData?.fileIds?.[0] || null;
    }

    // 3. Добавить 4 вопроса разных типов
    const questionConfigs = [
        {
            text: 'Вопрос с одним выбором',
            type: QUESTION_TYPES.SingleChoice,
            points: 1,
            options: [
                {text: 'Вариант A', isCorrect: true},
                {text: 'Вариант B', isCorrect: false},
            ],
        },
        {
            text: 'Вопрос с множественным выбором',
            type: QUESTION_TYPES.MultipleChoice,
            points: 2,
            options: [
                {text: 'Опция 1', isCorrect: true},
                {text: 'Опция 2', isCorrect: true},
                {text: 'Опция 3', isCorrect: false},
            ],
        },
        {
            text: 'Вопрос Да/Нет',
            type: QUESTION_TYPES.TrueFalse,
            points: 1,
            correctAnswer: true,
        },
        {
            text: 'Текстовый вопрос' + (mediaId ? ' (с картинкой)' : ''),
            type: QUESTION_TYPES.ShortAnswer,
            points: 3,
            correctAnswer: 'ответ',
            ...(mediaId ? {mediaId} : {}),
        },
    ];

    for (let i = 0; i < questionConfigs.length; i++) {
        if (stopRef?.current) break;

        const qResult = await runStep({
            id: `scenario-create-question-${i + 1}`,
            client: assessmentClient,
            method: 'POST',
            path: `/api/tests/${testId}/questions`,
            data: questionConfigs[i],
            expectedStatuses: [201, 200],
            message: `Добавление вопроса ${i + 1}`,
        });

        const qId = getQuestionId(qResult?.responseData);
        if (qId) questionIds.push(qId);
    }

    // 4. Опубликовать тест (PUT!)
    await runStep({
        id: 'scenario-create-publish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Публикация теста',
    });

    // 5. Снять с публикации (PUT!)
    await runStep({
        id: 'scenario-create-unpublish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // 6. Обновить параметры теста
    await runStep({
        id: 'scenario-create-update-test',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}`,
        data: {
            title: `Updated Create Flow Test ${Date.now()}`,
            description: 'Обновлённый сценарий создания',
            durationMinutes: 60,
            maxAttempts: 10,
        },
        expectedStatuses: [200, 204],
        message: 'Обновление теста',
    });

    // 7. Изменить старые вопросы (PUT /api/questions/{id})
    for (let i = 0; i < Math.min(2, questionIds.length); i++) {
        if (stopRef?.current) break;
        await runStep({
            id: `scenario-create-update-question-${i + 1}`,
            client: assessmentClient,
            method: 'PUT',
            path: `/api/questions/${questionIds[i]}`,
            data: {
                text: `Обновлённый вопрос ${i + 1}`,
                type: QUESTION_TYPES.SingleChoice,
                points: i + 2,
                options: [
                    {text: 'Новый A', isCorrect: true},
                    {text: 'Новый B', isCorrect: false},
                ],
            },
            expectedStatuses: [200, 204],
            message: `Обновление вопроса ${i + 1}`,
        });
    }

    // 8. Добавить 3 новых вопроса
    for (let i = 0; i < 3; i++) {
        if (stopRef?.current) break;
        const qResult = await runStep({
            id: `scenario-create-extra-question-${i + 1}`,
            client: assessmentClient,
            method: 'POST',
            path: `/api/tests/${testId}/questions`,
            data: {
                text: `Дополнительный вопрос ${i + 1}`,
                type: QUESTION_TYPES.SingleChoice,
                points: 1,
                options: [
                    {text: 'Да', isCorrect: true},
                    {text: 'Нет', isCorrect: false},
                ],
            },
            expectedStatuses: [201, 200],
            message: `Добавление дополнительного вопроса ${i + 1}`,
        });
        const qId = getQuestionId(qResult?.responseData);
        if (qId) questionIds.push(qId);
    }

    // 9. Опубликовать повторно (PUT!)
    await runStep({
        id: 'scenario-create-publish-again',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Повторная публикация теста',
    });

    // 10. Снять с публикации (PUT!)
    await runStep({
        id: 'scenario-create-unpublish-again',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Повторное снятие с публикации',
    });

    // 11. Удалить вопросы (DELETE /api/questions/{id})
    for (const qId of questionIds) {
        if (stopRef?.current) break;
        await runStep({
            id: `scenario-create-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // 12. Удалить тест
    await runStep({
        id: 'scenario-create-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

// ============================================================================
// СЦЕНАРИЙ: Прохождение теста (test-pass-flow)
// ============================================================================
async function runTestPassFlowScenario({runStep, stopRef, assessmentClient, aiClient, mediaClient}) {
    let testId = null;
    let attemptId = null;
    const questionIds = [];
    const questionRecords = [];
    let mediaId = null;

    // 1. Создать тест
    const createResult = await runStep({
        id: 'scenario-pass-test',
        client: assessmentClient,
        method: 'POST',
        path: '/api/tests',
        data: {
            title: `Pass Flow Test ${Date.now()}`,
            description: 'Сценарий прохождения теста',
            durationMinutes: 30,
            maxAttempts: 5,
        },
        expectedStatuses: [201, 200],
        message: 'Создание теста',
    });
    testId = extractId(createResult?.responseData);
    if (!testId) return;

    // 2. Загрузить медиа (если есть mediaClient)
    if (mediaClient) {
        const formData = new FormData();
        const blob = new Blob(['image content'], {type: 'image/png'});
        formData.append('files', blob, 'test-image.png');

        const mediaResult = await runStep({
            id: 'scenario-pass-media',
            client: mediaClient,
            method: 'POST',
            path: '/api/files/upload',
            data: formData,
            expectedStatuses: [200, 201, 400, 415],
            message: 'Загрузка медиа-файла',
        });
        mediaId = mediaResult?.responseData?.fileIds?.[0] || null;
    }

    // 3. Добавить 4 вопроса разных типов
    const questionConfigs = [
        {
            text: 'Вопрос 1: Один выбор',
            type: QUESTION_TYPES.SingleChoice,
            points: 1,
            options: [
                {text: 'Правильный', isCorrect: true},
                {text: 'Неправильный', isCorrect: false},
            ],
        },
        {
            text: 'Вопрос 2: Множественный выбор',
            type: QUESTION_TYPES.MultipleChoice,
            points: 2,
            options: [
                {text: 'Верно 1', isCorrect: true},
                {text: 'Верно 2', isCorrect: true},
                {text: 'Неверно', isCorrect: false},
            ],
        },
        {
            text: 'Вопрос 3: Да/Нет',
            type: QUESTION_TYPES.TrueFalse,
            points: 1,
            correctAnswer: true,
            options: [
                {text: 'Да', isCorrect: true},
                {text: 'Нет', isCorrect: false},
            ],
        },
        {
            text: 'Вопрос 4: Текстовый' + (mediaId ? ' (с картинкой)' : ''),
            type: QUESTION_TYPES.ShortAnswer,
            points: 3,
            correctAnswer: 'ответ',
            answerText: 'ответ',
            ...(mediaId ? {mediaId} : {}),
        },
    ];

    for (let i = 0; i < questionConfigs.length; i++) {
        if (stopRef?.current) break;

        const qResult = await runStep({
            id: `scenario-pass-question-${i + 1}`,
            client: assessmentClient,
            method: 'POST',
            path: `/api/tests/${testId}/questions`,
            data: questionConfigs[i],
            expectedStatuses: [201, 200],
            message: `Добавление вопроса ${i + 1}`,
        });

        const qId = getQuestionId(qResult?.responseData);
        if (qId) {
            questionIds.push(qId);
            questionRecords.push(buildQuestionRecordFromResponse(questionConfigs[i], qId, qResult?.responseData));
        }
    }

    // 4. Опубликовать (PUT!)
    await runStep({
        id: 'scenario-pass-publish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Публикация теста',
    });

    // 5. Создать попытку
    const attemptResult = await runStep({
        id: 'scenario-pass-attempt',
        client: assessmentClient,
        method: 'POST',
        path: `/api/tests/${testId}/attempts`,
        expectedStatuses: [201, 200],
        message: 'Создание попытки',
    });
    attemptId = extractAttemptId(attemptResult?.responseData);

    if (attemptId && questionRecords.length > 0) {
        // 6. Ответить на вопрос верно (PUT с optionId/optionIds/text)
        const correctPayload = buildAnswerPayload(questionRecords[0]);
        await runStep({
            id: 'scenario-pass-answer-correct',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/attempts/${attemptId}/answers/${questionRecords[0].id}`,
            data: correctPayload,
            expectedStatuses: [200, 201, 204],
            message: 'Ответ на вопрос (верно)',
        });

        // 7. Ответить на вопрос неверно (PUT с optionId/optionIds/text)
        if (questionRecords.length > 1) {
            const wrongPayload = buildIncorrectAnswerPayload(questionRecords[1]);
            await runStep({
                id: 'scenario-pass-answer-wrong',
                client: assessmentClient,
                method: 'PUT',
                path: `/api/attempts/${attemptId}/answers/${questionRecords[1].id}`,
                data: wrongPayload,
                expectedStatuses: [200, 201, 204],
                message: 'Ответ на вопрос (неверно)',
            });
        }

        // 8. Ответить на остальные вопросы
        for (let i = 2; i < questionRecords.length; i++) {
            if (stopRef?.current) break;

            const answerPayload = buildAnswerPayload(questionRecords[i]);

            await runStep({
                id: `scenario-pass-answer-${i + 1}`,
                client: assessmentClient,
                method: 'PUT',
                path: `/api/attempts/${attemptId}/answers/${questionRecords[i].id}`,
                data: answerPayload,
                expectedStatuses: [200, 201, 204],
                message: `Ответ на вопрос ${i + 1}`,
            });
        }

        // 9. Подсказка AI
        if (aiClient && questionRecords.length > 0) {
            await runStep({
                id: 'scenario-pass-ai-hint',
                client: aiClient,
                method: 'POST',
                path: `/api/ai/attempts/${attemptId}/questions/${questionRecords[0].id}/hint`,
                expectedStatuses: [200, 201, 404, 503],
                message: 'Запрос подсказки AI',
            });
        }

        // 10. Завершить попытку
        await runStep({
            id: 'scenario-pass-submit',
            client: assessmentClient,
            method: 'POST',
            path: `/api/attempts/${attemptId}/submit`,
            expectedStatuses: [200, 204],
            message: 'Завершение попытки',
        });

        // 11. Оценить ответ вручную (PUT /api/attempts/{attemptId}/answers/{questionId}/grade)
        if (questionRecords.length > 3) {
            await runStep({
                id: 'scenario-pass-grade',
                client: assessmentClient,
                method: 'PUT',
                path: `/api/attempts/${attemptId}/answers/${questionRecords[3].id}/grade`,
                data: {
                    score: 2,
                    feedback: 'Хороший ответ',
                },
                expectedStatuses: [200, 204, 400],
                message: 'Оценка ответа вручную',
            });
        }

        // 12. Получить результат
        await runStep({
            id: 'scenario-pass-result',
            client: assessmentClient,
            method: 'GET',
            path: `/api/attempts/${attemptId}/result`,
            expectedStatuses: [200],
            message: 'Получение результата',
        });
    }

    // 13. Снять с публикации (PUT!)
    await runStep({
        id: 'scenario-pass-unpublish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // 14. Удалить вопросы (DELETE /api/questions/{id})
    for (const qId of questionIds) {
        if (stopRef?.current) break;
        await runStep({
            id: `scenario-pass-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // 15. Удалить тест
    await runStep({
        id: 'scenario-pass-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

// ============================================================================
// СЦЕНАРИЙ: Публикация без вопросов (publish-without-questions)
// ============================================================================
async function runPublishWithoutQuestionsScenario({runStep, stopRef, assessmentClient}) {
    let testId = null;
    const questionIds = [];

    // 1. Создать тест
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
    testId = extractId(createResult?.responseData);
    if (!testId) return;

    // 2. Попытаться опубликовать без вопросов (ожидаем ошибку) - PUT!
    await runStep({
        id: 'scenario-publish-without-questions',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [400, 422],
        message: 'Публикация без вопросов (ожидаем отказ)',
    });

    // 3. Добавить вопрос
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

    // 4. Успешно опубликовать (PUT!)
    await runStep({
        id: 'scenario-publish-success',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/publish`,
        expectedStatuses: [200, 204],
        message: 'Успешная публикация',
    });

    // 5. Снять с публикации (PUT!)
    await runStep({
        id: 'scenario-publish-unpublish',
        client: assessmentClient,
        method: 'PUT',
        path: `/api/tests/${testId}/unpublish`,
        expectedStatuses: [200, 204],
        message: 'Снятие с публикации',
    });

    // 6. Удалить вопросы (DELETE /api/questions/{id})
    for (const qId of questionIds) {
        if (stopRef?.current) break;
        await runStep({
            id: `scenario-publish-delete-question-${qId}`,
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${qId}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // 7. Удалить тест
    await runStep({
        id: 'scenario-publish-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

// ============================================================================
// СЦЕНАРИЙ: Черновик и правки (draft-flow)
// ============================================================================
async function runDraftFlowScenario({runStep, stopRef, assessmentClient}) {
    let testId = null;
    const questionIds = [];

    // 1. Создать тест
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
    testId = extractId(createResult?.responseData);
    if (!testId) return;

    // 2. Обновить тест
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

    // 3. Добавить вопросы
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
                    {text: 'Да', isCorrect: i === 0},
                    {text: 'Нет', isCorrect: i !== 0},
                ],
            },
            expectedStatuses: [201, 200],
            message: `Добавление вопроса ${i + 1}`,
        });

        const qId = getQuestionId(qResult?.responseData);
        if (qId) questionIds.push(qId);
    }

    // 4. Переупорядочить вопросы (PUT /api/tests/{testId}/questions/reorder)
    if (questionIds.length >= 2) {
        await runStep({
            id: 'scenario-draft-reorder',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/tests/${testId}/questions/reorder`,
            data: [...questionIds].reverse(),
            expectedStatuses: [200, 204],
            message: 'Переупорядочивание вопросов',
        });
    }

    // 5. Обновить первый вопрос (PUT /api/questions/{id})
    if (questionIds.length > 0) {
        await runStep({
            id: 'scenario-draft-update-question',
            client: assessmentClient,
            method: 'PUT',
            path: `/api/questions/${questionIds[0]}`,
            data: {
                text: 'Обновлённый вопрос 1',
                type: QUESTION_TYPES.SingleChoice,
                points: 2,
                options: [
                    {text: 'Обновлено Да', isCorrect: true},
                    {text: 'Обновлено Нет', isCorrect: false},
                ],
            },
            expectedStatuses: [200, 204],
            message: 'Обновление вопроса',
        });
    }

    // 6. Удалить один вопрос (DELETE /api/questions/{id})
    if (questionIds.length > 1) {
        await runStep({
            id: 'scenario-draft-delete-question',
            client: assessmentClient,
            method: 'DELETE',
            path: `/api/questions/${questionIds[1]}`,
            expectedStatuses: [200, 204],
            message: 'Удаление вопроса',
        });
    }

    // 7. Удалить тест
    await runStep({
        id: 'scenario-draft-delete-test',
        client: assessmentClient,
        method: 'DELETE',
        path: `/api/tests/${testId}`,
        expectedStatuses: [200, 204],
        message: 'Удаление теста',
    });
}

// ============================================================================
// Карта сценариев → функций запуска
// ============================================================================
const SCENARIO_RUNNERS = {
    'full-cycle': runFullCycleScenario,
    'test-create-flow': runTestCreateFlowScenario,
    'test-pass-flow': runTestPassFlowScenario,
    'publish-without-questions': runPublishWithoutQuestionsScenario,
    'draft-flow': runDraftFlowScenario,
};

// ============================================================================
// Публичный API
// ============================================================================

/**
 * Запуск конкретного сценария по ID
 *
 * @param {string} scenarioId - ID сценария для запуска
 * @param {Object} options
 * @param {Function} options.onResult - Колбэк для каждого результата шага
 * @param {Object} options.stopRef - Ref с полем .current (boolean), чтобы сигнализировать остановку
 * @returns {Promise<void>}
 */
export async function runScenarioById(scenarioId, {onResult, stopRef}) {
    const scenario = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);
    if (!scenario) {
        throw new Error(`Сценарий "${scenarioId}" не найден`);
    }

    const scenarioRunner = SCENARIO_RUNNERS[scenarioId];
    if (!scenarioRunner) {
        throw new Error(`Сценарий "${scenarioId}" не реализован`);
    }

    const token = await getAccessToken();
    const headers = token ? {Authorization: `Bearer ${token}`} : undefined;

    const assessmentClient = apiClients.assessment;
    const mediaClient = apiClients.media;
    const aiClient = apiClients.ai;

    // Хелпер: отправить результат шага наружу
    const push = (result) => {
        if (stopRef?.current) return;
        onResult?.({...result, scenarioId});
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
