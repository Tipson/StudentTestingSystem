/**
 * Константы для автотестов
 *
 * ВАЖНО: Названия типов вопросов должны соответствовать API
 */

export const QUESTION_TYPES = Object.freeze({
    SingleChoice: 0,
    MultipleChoice: 1,
    TrueFalse: 2,
    ShortAnswer: 3,
    LongAnswer: 4,
    // Алиасы для совместимости
    MultiChoice: 1,
    ShortText: 3,
    LongText: 4,
});

export const MAX_AUTOTEST_MESSAGE_LENGTH = 600;

// Сколько раз повторять автотест при ошибке
export const AUTO_TEST_RETRY_LIMIT = 0;

// Задержка между повторными запусками автотеста (в миллисекундах)
export const AUTO_TEST_RETRY_DELAY_MS = 500;

// Базовое количество шагов автотеста без учёта шагов для вопросов
export const AUTO_TEST_FIXED_STEP_COUNT = 47;

// Количество шагов на каждый вопрос: создание, ответ, удаление
export const AUTO_TEST_PER_QUESTION_STEP_COUNT = 3;

/**
 * Формирует шаблон вопросов для автотеста
 *
 * @param {string} label - Суффикс, добавляемый к заголовкам вопросов
 * @returns {Array} Массив шаблонов вопросов
 */
export const buildAutoTestQuestions = (label) => ([
    {
        label: 'SingleChoice',
        text: `HTTP: какой статус возвращается при создании ресурса? (${label})`,
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
        label: 'MultipleChoice',
        text: `Выберите компоненты многофакторной аутентификации (${label})`,
        type: QUESTION_TYPES.MultipleChoice,
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
        label: 'TrueFalse',
        text: `JWT можно проверить без запроса к серверу авторизации (${label})`,
        type: QUESTION_TYPES.TrueFalse,
        points: 1,
        isRequired: true,
        options: [
            {text: 'Да', isCorrect: true, order: 1},
            {text: 'Нет', isCorrect: false, order: 2},
        ],
    },
    {
        label: 'ShortAnswer',
        text: `Укажите пример ISO-8601 времени в UTC (${label})`,
        type: QUESTION_TYPES.ShortAnswer,
        points: 2,
        isRequired: true,
        answerText: '2026-01-19T12:30:00Z',
        correctAnswer: '2026-01-19T12:30:00Z',
        options: [
            {text: '2026-01-19T12:30:00Z', isCorrect: true, order: 1},
        ],
    },
    {
        label: 'LongAnswer',
        text: `Опишите шаги подготовки теста перед публикацией (${label})`,
        type: QUESTION_TYPES.LongAnswer,
        points: 4,
        isRequired: true,
        answerText:
            'Сначала создаём тест и добавляем вопросы, затем настраиваем лимиты, ' +
            'проверяем правильность ответов и только после этого публикуем.',
        correctAnswer:
            'Сначала создаём тест и добавляем вопросы, затем настраиваем лимиты, ' +
            'проверяем правильность ответов и только после этого публикуем.',
        options: [
            {
                text:
                    'Сначала создаём тест и добавляем вопросы, затем настраиваем лимиты, ' +
                    'проверяем правильность ответов и только после этого публикуем.',
                isCorrect: true,
                order: 1,
            },
        ],
    },
]);
