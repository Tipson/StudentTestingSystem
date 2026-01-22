export const QUESTION_TYPES = Object.freeze({
    SingleChoice: 0,
    MultiChoice: 1,
    TrueFalse: 2,
    ShortText: 3,
    LongText: 4,
});

export const MAX_AUTOTEST_MESSAGE_LENGTH = 600;

// Сколько раз повторять автотест при ошибке.
export const AUTO_TEST_RETRY_LIMIT = 0;
export const AUTO_TEST_RETRY_DELAY_MS = 500;

// Базовое количество шагов автотестов без учёта шагов на каждый вопрос.
export const AUTO_TEST_FIXED_STEP_COUNT = 47;

// На каждый вопрос добавляем: создание, ответ, удаление.
export const AUTO_TEST_PER_QUESTION_STEP_COUNT = 3;
