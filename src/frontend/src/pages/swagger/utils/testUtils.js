import testCatImage from '../testCat.png';
import {QUESTION_TYPES, AUTO_TEST_RETRY_LIMIT, AUTO_TEST_RETRY_DELAY_MS} from '../constants/testConstants.js';
import {limitAutoTestMessage} from './formatters.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isBinaryPayload = (value) => {
    if (!value) return false;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(value)) return true;
    return false;
};

export const normalizeAutoTestResponseData = (value) => {
    if (value == null) return null;
    if (!isBinaryPayload(value)) return value;

    const size = value.size ?? value.byteLength ?? value.buffer?.byteLength ?? null;
    return {
        message: 'Бинарные данные',
        size,
        type: value.type ?? null,
    };
};

export const normalizeExpectedStatuses = (value) => {
    if (value === null || value === undefined) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .map((v) => (typeof v === 'string' ? Number(v) : v))
        .filter((v) => Number.isFinite(v));
};

// Универсальный исполнитель шага с повтором и поддержкой ожидаемого статуса.
export const runStepWithRetries = async (step, ctx, pushResult) => {
    const skipReason = step.skip ? step.skip(ctx) : '';
    if (skipReason) {
        pushResult({
            id: step.id,
            title: step.title,
            service: step.service,
            method: step.method,
            path: step.path,
            status: 'skipped',
            durationMs: 0,
            message: skipReason,
        });
        return null;
    }

    const startedAt = Date.now();
    const retryLimit = Math.max(0, step.retries ?? AUTO_TEST_RETRY_LIMIT);
    const expectedStatuses = normalizeExpectedStatuses(step.expectStatus);
    const hasExpected = expectedStatuses.length > 0;
    let attempt = 0;
    let lastError = null;

    while (attempt <= retryLimit) {
        attempt += 1;
        try {
            const response = await step.run(ctx);

            if (hasExpected && !expectedStatuses.includes(response?.status)) {
                pushResult({
                    id: step.id,
                    title: step.title,
                    service: step.service,
                    method: step.method,
                    path: step.path,
                    status: 'failed',
                    httpStatus: response?.status ?? null,
                    durationMs: Date.now() - startedAt,
                    message: `Ожидался HTTP ${expectedStatuses.join(', ')}, но пришёл ${response?.status ?? '-'}.`,
                    responseData: normalizeAutoTestResponseData(response?.data),
                });
                return null;
            }

            if (step.onSuccess) {
                step.onSuccess(response, ctx);
            }

            const baseMessage = step.getMessage ? step.getMessage(response, ctx) : '';
            const retryNote = attempt > 1 ? ` (попытка ${attempt}/${retryLimit + 1})` : '';
            const message = baseMessage
                ? `${baseMessage}${retryNote}`
                : retryNote.trim();

            pushResult({
                id: step.id,
                title: step.title,
                service: step.service,
                method: step.method,
                path: step.path,
                status: 'success',
                httpStatus: response?.status ?? null,
                durationMs: Date.now() - startedAt,
                message,
                responseData: normalizeAutoTestResponseData(response?.data),
            });
            return response;
        } catch (error) {
            const status = error?.response?.status ?? null;

            if (hasExpected && status != null && expectedStatuses.includes(status)) {
                pushResult({
                    id: step.id,
                    title: step.title,
                    service: step.service,
                    method: step.method,
                    path: step.path,
                    status: 'success',
                    httpStatus: status,
                    durationMs: Date.now() - startedAt,
                    message: step.expectMessage || `Ожидаемый HTTP ${status}.`,
                    responseData: normalizeAutoTestResponseData(error?.response?.data ?? error?.message ?? error),
                });
                return null;
            }

            lastError = error;
            if (attempt <= retryLimit) {
                await sleep(AUTO_TEST_RETRY_DELAY_MS);
            }
        }
    }

    const status = lastError?.response?.status ?? null;
    const data = lastError?.response?.data ?? lastError?.message ?? lastError;
    const retryNote = retryLimit > 0 ? ` (попыток: ${retryLimit + 1})` : '';
    pushResult({
        id: step.id,
        title: step.title,
        service: step.service,
        method: step.method,
        path: step.path,
        status: 'failed',
        httpStatus: status,
        durationMs: Date.now() - startedAt,
        message: `${limitAutoTestMessage(data)}${retryNote}`,
        responseData: normalizeAutoTestResponseData(data),
    });

    return null;
};

export const createSampleImageFile = async () => {
    const fallbackBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+AL6Vb0ZsQAAAABJRU5ErkJggg==';

    try {
        const response = await fetch(testCatImage);
        if (response.ok) {
            const blob = await response.blob();
            return new File([blob], 'autotest.png', {type: blob.type || 'image/png'});
        }
    } catch (error) {
        // Используем запасной файл, если картинку не удалось загрузить.
    }

    const bytes = Uint8Array.from(atob(fallbackBase64), (char) => char.charCodeAt(0));
    return new File([bytes], 'autotest.png', {type: 'image/png'});
};

export const buildAutoTestQuestions = (label) => ([
    {
        title: `HTTP: какой статус возвращается при создании ресурса? (${label})`,
        type: QUESTION_TYPES.SingleChoice,
        points: 2,
        isRequired: true,
        attachMediaToQuestion: true,
        options: [
            {text: '201 Created', isCorrect: true, order: 1},
            {text: '200 OK', isCorrect: false, order: 2},
            {text: '204 No Content', isCorrect: false, order: 3},
            {text: '404 Not Found', isCorrect: false, order: 4},
        ],
    },
    {
        title: `Выберите компоненты многофакторной аутентификации (${label})`,
        type: QUESTION_TYPES.MultiChoice,
        points: 3,
        isRequired: true,
        attachMediaToOptionIndex: 0,
        options: [
            {text: 'Пароль пользователя', isCorrect: true, order: 1},
            {text: 'Одноразовый код из приложения', isCorrect: true, order: 2},
            {text: 'HTTP заголовок User-Agent', isCorrect: false, order: 3},
            {text: 'Любимый цвет', isCorrect: false, order: 4},
        ],
    },
    {
        title: `JWT можно проверить без запроса к серверу авторизации (${label})`,
        type: QUESTION_TYPES.TrueFalse,
        points: 1,
        isRequired: true,
        options: [
            {text: 'Да', isCorrect: true, order: 1},
            {text: 'Нет', isCorrect: false, order: 2},
        ],
    },
    {
        title: `Укажите пример ISO-8601 времени в UTC (${label})`,
        type: QUESTION_TYPES.ShortText,
        points: 2,
        isRequired: true,
        answerText: '2026-01-19T12:30:00Z',
        options: [
            {text: '2026-01-19T12:30:00Z', isCorrect: true, order: 1},
        ],
    },
    {
        title: `Опишите шаги подготовки теста перед публикацией (${label})`,
        type: QUESTION_TYPES.LongText,
        points: 4,
        isRequired: true,
        answerText: 'Сначала создаём тест и добавляем вопросы, затем настраиваем лимиты, ' +
            'проверяем правильность ответов и только после этого публикуем.',
        options: [
            {
                text: 'Сначала создаём тест и добавляем вопросы, затем настраиваем лимиты, ' +
                    'проверяем правильность ответов и только после этого публикуем.',
                isCorrect: true,
                order: 1,
            },
        ],
    },
]);

// Формирует payload вопроса с учётом медиа-аттачей.
export const buildQuestionPayload = (template, mediaIds = []) => {
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0;
    const questionMediaIds = template.attachMediaToQuestion && hasMedia
        ? mediaIds.slice(0, 1)
        : null;
    const options = (template.options || []).map((option, optionIndex) => {
        if (template.attachMediaToOptionIndex === optionIndex && hasMedia) {
            return {...option, mediaIds: mediaIds.slice(0, 1)};
        }
        return option;
    });

    return {
        text: template.title,
        type: template.type,
        isRequired: template.isRequired ?? true,
        points: template.points ?? 1,
        options,
        mediaIds: questionMediaIds && questionMediaIds.length ? questionMediaIds : null,
    };
};

// Собирает метаданные вопроса для ответов и последующего удаления.
export const buildQuestionRecord = (question, sourceOptions, fallback = {}) => {
    const options = question?.options || [];
    const optionMap = new Map(options.map((option) => [option.text, option.id]));
    const correctOptionIds = (sourceOptions || [])
        .filter((option) => option.isCorrect)
        .map((option) => optionMap.get(option.text))
        .filter(Boolean);
    const correctText = (sourceOptions || [])
        .find((option) => option.isCorrect)?.text || '';

    return {
        id: question?.id ?? question?.Id ?? null,
        type: question?.type ?? fallback.type ?? null,
        points: question?.points ?? fallback.points ?? null,
        options,
        correctOptionIds,
        correctText,
        answerText: fallback.answerText || correctText || '',
    };
};

// Собирает корректный payload ответа для SaveAnswer.
export const buildAnswerPayload = (question) => {
    if (!question) {
        return {optionId: null, optionIds: [], text: 'Автотестовый ответ'};
    }

    const type = question.type;
    const options = Array.isArray(question.options) ? question.options : [];
    const optionMap = new Map(options.map((option) => [option.id, option.text]));
    const getOptionText = (id) => optionMap.get(id) || '';

    if (type === QUESTION_TYPES.SingleChoice || type === QUESTION_TYPES.TrueFalse) {
        const optionId = question.correctOptionIds?.[0] || options[0]?.id || null;
        const optionIds = optionId ? [optionId] : [];
        const optionText = optionId ? getOptionText(optionId) : '';
        return {
            optionId,
            optionIds,
            text: optionText ? `Выбран вариант: ${optionText}` : 'Выбран вариант',
        };
    }

    if (type === QUESTION_TYPES.MultiChoice) {
        const fallbackIds = options.map((option) => option.id).filter(Boolean).slice(0, 2);
        const optionIds = (question.correctOptionIds?.length ? question.correctOptionIds : fallbackIds)
            .filter(Boolean);
        const optionId = optionIds[0] || null;
        const optionText = optionIds.map(getOptionText).filter(Boolean).join(', ');
        return {
            optionId,
            optionIds,
            text: optionText ? `Выбраны варианты: ${optionText}` : 'Выбраны варианты',
        };
    }

    if (type === QUESTION_TYPES.ShortText || type === QUESTION_TYPES.LongText) {
        const text = question.answerText || question.correctText || 'Автотестовый ответ';
        return {optionId: null, optionIds: [], text};
    }

    return {optionId: null, optionIds: [], text: 'Автотестовый ответ'};
};

// Формирует заведомо неверный ответ.
export const buildIncorrectAnswerPayload = (question) => {
    if (!question) {
        return {optionId: null, optionIds: [], text: 'Неверный ответ'};
    }

    const type = question.type;
    const options = Array.isArray(question.options) ? question.options : [];
    const correctIds = Array.isArray(question.correctOptionIds) ? question.correctOptionIds : [];
    const wrongOptions = options.filter((option) => option.id && !correctIds.includes(option.id));
    const wrongOptionId = wrongOptions[0]?.id || options[0]?.id || null;

    if (type === QUESTION_TYPES.SingleChoice || type === QUESTION_TYPES.TrueFalse) {
        return {
            optionId: wrongOptionId,
            optionIds: wrongOptionId ? [wrongOptionId] : [],
            text: 'Неверный вариант',
        };
    }

    if (type === QUESTION_TYPES.MultiChoice) {
        const optionIds = wrongOptions.map((option) => option.id).filter(Boolean).slice(0, 2);
        return {
            optionId: optionIds[0] || wrongOptionId || null,
            optionIds,
            text: optionIds.length ? 'Неверные варианты' : 'Неверный вариант',
        };
    }

    if (type === QUESTION_TYPES.ShortText || type === QUESTION_TYPES.LongText) {
        return {optionId: null, optionIds: [], text: 'Неверный ответ'};
    }

    return {optionId: null, optionIds: [], text: 'Неверный ответ'};
};

export const getQuestionId = (question) => question?.id ?? question?.Id ?? null;
