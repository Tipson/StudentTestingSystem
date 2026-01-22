/**
 * Утилиты для выполнения автотестов
 */
import testCatImage from '../testCat.png';
import {QUESTION_TYPES, AUTO_TEST_RETRY_LIMIT, AUTO_TEST_RETRY_DELAY_MS} from '../constants/autotest.js';
import {limitAutoTestMessage} from './formatters.js';

/**
 * Пауза на указанное количество миллисекунд
 * @param {number} ms - Количество миллисекунд ожидания
 * @returns {Promise<void>} Promise, который завершится после задержки
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Нормализует ожидаемые HTTP-статусы в массив чисел
 * @param {*} value - Значение(я) статуса(ов)
 * @returns {number[]} Массив кодов статусов
 */
export const normalizeExpectedStatuses = (value) => {
    if (value === null || value === undefined) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .map((v) => (typeof v === 'string' ? Number(v) : v))
        .filter((v) => Number.isFinite(v));
};

/**
 * Проверяет, является ли значение бинарными данными
 * @param {*} value - Значение для проверки
 * @returns {boolean} true, если бинарные данные
 */
export const isBinaryPayload = (value) => {
    if (!value) return false;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(value)) return true;
    return false;
};

/**
 * Нормализует данные ответа автотеста (в т.ч. обрабатывает бинарные данные)
 * @param {*} value - Данные ответа
 * @returns {*} Нормализованные данные
 */
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

/**
 * Формирует уникальный ключ для строки результата
 * @param {Object} item - Элемент результата
 * @param {number} index - Индекс в массиве
 * @returns {string} Уникальный ключ
 */
export const makeResultRowKey = (item, index) => {
    if (item?.id) return String(item.id);
    const method = item?.method || 'unknown';
    const path = item?.path || 'unknown';
    return `${method}-${path}-${index}`;
};

/**
 * Выполняет шаг теста с повторами (ретраями)
 * @param {Object} config - Конфигурация шага
 * @param {string} config.id - ID шага
 * @param {Object} config.client - Axios-клиент
 * @param {string} config.method - HTTP-метод
 * @param {string} config.path - Путь API
 * @param {Object} [config.data] - Данные запроса
 * @param {Object} [config.headers] - Заголовки запроса
 * @param {number[]} [config.expectedStatuses] - Ожидаемые HTTP-статусы
 * @param {string} [config.message] - Сообщение шага
 * @param {number} [config.retryLimit] - Количество повторов
 * @param {number} [config.retryDelay] - Задержка между повторами
 * @returns {Promise<Object>} Объект результата
 */
export const runStepWithRetries = async (config) => {
    const {
        id,
        client,
        method,
        path,
        data,
        headers,
        expectedStatuses = [],
        message = '',
        retryLimit = AUTO_TEST_RETRY_LIMIT,
        retryDelay = AUTO_TEST_RETRY_DELAY_MS,
    } = config;

    const startedAt = Date.now();
    const hasExpected = expectedStatuses.length > 0;
    let attempt = 0;
    let lastError = null;

    while (attempt <= retryLimit) {
        attempt += 1;
        try {
            const requestConfig = {
                method,
                url: path,
                headers,
            };

            if (data !== undefined) {
                requestConfig.data = data;
            }

            const response = await client.request(requestConfig);
            const status = response?.status;

            // Проверяем, что статус совпал с ожидаемым
            if (hasExpected && !expectedStatuses.includes(status)) {
                return {
                    id,
                    method,
                    path,
                    status: 'failed',
                    httpStatus: status,
                    durationMs: Date.now() - startedAt,
                    message: `Ожидался HTTP ${expectedStatuses.join(', ')}, но пришёл ${status ?? '-'}. ${message}`,
                    responseData: normalizeAutoTestResponseData(response?.data),
                };
            }

            const retryNote = attempt > 1 ? ` (попытка ${attempt}/${retryLimit + 1})` : '';

            return {
                id,
                method,
                path,
                status: 'success',
                httpStatus: status,
                durationMs: Date.now() - startedAt,
                message: `${message}${retryNote}`,
                responseData: normalizeAutoTestResponseData(response?.data),
            };
        } catch (error) {
            const status = error?.response?.status ?? null;

            // Если код ошибки входит в ожидаемые — считаем шаг успешным
            if (hasExpected && status != null && expectedStatuses.includes(status)) {
                return {
                    id,
                    method,
                    path,
                    status: 'success',
                    httpStatus: status,
                    durationMs: Date.now() - startedAt,
                    message: `Ожидаемый HTTP ${status}. ${message}`,
                    responseData: normalizeAutoTestResponseData(error?.response?.data ?? error?.message ?? error),
                };
            }

            lastError = error;
            if (attempt <= retryLimit) {
                await sleep(retryDelay);
            }
        }
    }

    const status = lastError?.response?.status ?? null;
    const errorData = lastError?.response?.data ?? lastError?.message ?? lastError;
    const retryNote = retryLimit > 0 ? ` (попыток: ${retryLimit + 1})` : '';

    return {
        id,
        method,
        path,
        status: 'failed',
        httpStatus: status,
        durationMs: Date.now() - startedAt,
        message: `${limitAutoTestMessage(errorData)}${retryNote}`,
        responseData: normalizeAutoTestResponseData(errorData),
        error: lastError,
    };
};

/**
 * Создаёт пример файла изображения для тестов
 * @returns {File} Файл изображения
 */
export const createSampleImageFile = () => {
    const fallbackBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+AL6Vb0ZsQAAAABJRU5ErkJggg==';

    const bytes = Uint8Array.from(atob(fallbackBase64), (char) => char.charCodeAt(0));
    return new File([bytes], 'autotest.png', {type: 'image/png'});
};

/**
 * Собирает payload вопроса для создания
 * @param {Object} question - Шаблон вопроса
 * @returns {Object} Payload вопроса
 */
export const buildQuestionPayload = (question) => {
    const base = {
        text: question.text || question.title || 'Тестовый вопрос',
        type: question.type ?? QUESTION_TYPES.SingleChoice,
        points: question.points ?? 1,
        isRequired: question.isRequired ?? true,
    };

    // Добавляем варианты для вопросов с выбором
    if (question.options) {
        base.options = question.options;
    }

    // Добавляем правильный ответ для true/false и текстовых
    if (question.correctAnswer !== undefined) {
        base.correctAnswer = question.correctAnswer;
    }

    // Добавляем mediaIds, если они есть
    if (question.mediaIds) {
        base.mediaIds = question.mediaIds;
    }

    return base;
};

/**
 * Извлекает UUID опций из ответа API при создании вопроса
 * @param {Object} responseData - Данные ответа API
 * @returns {Array} Массив опций с id
 */
export const extractOptionsFromResponse = (responseData) => {
    if (!responseData) return [];

    // Опции могут быть в разных полях
    const options = responseData.options || responseData.Options || [];

    return options.map((opt, index) => ({
        id: opt.id || opt.Id || opt.optionId || opt.OptionId || null,
        text: opt.text || opt.Text || '',
        isCorrect: opt.isCorrect ?? opt.IsCorrect ?? false,
        order: opt.order ?? opt.Order ?? index,
    }));
};

/**
 * Собирает запись вопроса для трекинга (с UUID опций из ответа)
 * @param {Object} question - Шаблон вопроса
 * @param {string} questionId - ID созданного вопроса
 * @param {Object} responseData - Данные ответа API (содержит опции с UUID)
 * @returns {Object} Запись вопроса
 */
export const buildQuestionRecord = (question, questionId, responseData = null) => {
    // Извлекаем опции с UUID из ответа API
    const optionsFromApi = extractOptionsFromResponse(responseData);

    return {
        id: questionId,
        type: question.type ?? QUESTION_TYPES.SingleChoice,
        label: question.label || question.text || 'Question',
        // Используем опции из API (с UUID), если они есть
        options: optionsFromApi.length > 0 ? optionsFromApi : (question.options || []),
        correctAnswer: question.correctAnswer,
        answerText: question.answerText,
    };
};

/**
 * Собирает payload ответа в зависимости от типа вопроса
 *
 * Схема API:
 * {
 *   "optionId": "uuid",      // для SingleChoice/TrueFalse (один вариант)
 *   "optionIds": ["uuid"],   // для MultipleChoice (несколько вариантов)
 *   "text": "string"         // для текстовых ответов
 * }
 *
 * @param {Object} record - Запись вопроса (должна содержать опции с UUID)
 * @returns {Object} Payload ответа
 */
export const buildAnswerPayload = (record) => {
    if (!record) {
        return {text: 'Автотестовый ответ'};
    }

    const type = record.type;
    const options = record.options || [];

    // SingleChoice и TrueFalse - используем optionId (UUID)
    if (type === QUESTION_TYPES.SingleChoice || type === QUESTION_TYPES.TrueFalse) {
        const correctOption = options.find((o) => o.isCorrect);
        if (correctOption?.id) {
            return {optionId: correctOption.id};
        }
        // Fallback: если нет UUID, берём первую опцию
        if (options[0]?.id) {
            return {optionId: options[0].id};
        }
        return {text: 'Ответ по умолчанию'};
    }

    // MultipleChoice - используем optionIds (массив UUID)
    if (type === QUESTION_TYPES.MultipleChoice || type === QUESTION_TYPES.MultiChoice) {
        const correctOptionIds = options
            .filter((o) => o.isCorrect && o.id)
            .map((o) => o.id);

        if (correctOptionIds.length > 0) {
            return {optionIds: correctOptionIds};
        }
        // Fallback: если нет корректных, берём первую опцию
        if (options[0]?.id) {
            return {optionIds: [options[0].id]};
        }
        return {text: 'Ответ по умолчанию'};
    }

    // ShortAnswer и LongAnswer - используем text
    if (
        type === QUESTION_TYPES.ShortAnswer ||
        type === QUESTION_TYPES.ShortText ||
        type === QUESTION_TYPES.LongAnswer ||
        type === QUESTION_TYPES.LongText
    ) {
        return {text: record.correctAnswer || record.answerText || 'Тестовый текстовый ответ'};
    }

    // Fallback для неизвестных типов
    if (options[0]?.id) {
        return {optionId: options[0].id};
    }
    return {text: 'Ответ по умолчанию'};
};

/**
 * Собирает payload неправильного ответа
 * @param {Object} record - Запись вопроса
 * @returns {Object} Payload неправильного ответа
 */
export const buildIncorrectAnswerPayload = (record) => {
    if (!record) {
        return {text: 'Неверный ответ'};
    }

    const type = record.type;
    const options = record.options || [];

    // SingleChoice и TrueFalse - выбираем неправильный вариант
    if (type === QUESTION_TYPES.SingleChoice || type === QUESTION_TYPES.TrueFalse) {
        const wrongOption = options.find((o) => !o.isCorrect && o.id);
        if (wrongOption?.id) {
            return {optionId: wrongOption.id};
        }
        // Fallback: если все правильные, берём последнюю опцию
        const lastOption = options[options.length - 1];
        if (lastOption?.id) {
            return {optionId: lastOption.id};
        }
        return {text: 'Неверный ответ'};
    }

    // MultipleChoice - выбираем неправильные варианты
    if (type === QUESTION_TYPES.MultipleChoice || type === QUESTION_TYPES.MultiChoice) {
        const wrongOptionIds = options
            .filter((o) => !o.isCorrect && o.id)
            .map((o) => o.id);

        if (wrongOptionIds.length > 0) {
            return {optionIds: wrongOptionIds.slice(0, 1)};
        }
        // Fallback
        if (options[0]?.id) {
            return {optionIds: [options[0].id]};
        }
        return {text: 'Неверный ответ'};
    }

    // Текстовые ответы
    if (
        type === QUESTION_TYPES.ShortAnswer ||
        type === QUESTION_TYPES.ShortText ||
        type === QUESTION_TYPES.LongAnswer ||
        type === QUESTION_TYPES.LongText
    ) {
        return {text: 'Неверный ответ'};
    }

    return {text: 'Неверный ответ'};
};

/**
 * Достаёт ID вопроса из ответа API
 * @param {Object} response - Ответ API
 * @returns {string|null} ID вопроса
 */
export const getQuestionId = (response) => response?.id ?? response?.Id ?? null;
