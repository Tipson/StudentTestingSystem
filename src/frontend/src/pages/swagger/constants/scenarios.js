/**
 * Константы и конфигурации, связанные со сценариями
 */

// Ожидаемое количество шагов в сценариях
// Обновляйте при изменении логики сценариев
export const SCENARIO_EXPECTED_TOTALS = {
    'full-cycle': 13,
    'test-create-flow': 26,
    'test-pass-flow': 22,
    'publish-without-questions': 7,
    'draft-flow': 8,
};

export const SCENARIO_STEPS = Object.freeze({
    'full-cycle': [
        'Создать тест',
        'Добавить вопросы',
        'Опубликовать тест',
        'Создать попытку',
        'Ответить на вопросы',
        'Запросить подсказку AI',
        'Завершить попытку',
        'Получить результат',
        'Снять с публикации',
        'Удалить вопросы и тест',
    ],
    'test-create-flow': [
        'Создать тест',
        'Добавить 4 вопроса разных типов (один с картинкой)',
        'Опубликовать тест',
        'Снять тест с публикации',
        'Обновить параметры теста',
        'Изменить старые вопросы',
        'Добавить 3 новых вопроса',
        'Опубликовать тест повторно',
        'Снять тест с публикации',
        'Удалить вопросы',
        'Удалить тест',
    ],
    'test-pass-flow': [
        'Создать тест',
        'Добавить 4 вопроса разных типов (один с картинкой)',
        'Опубликовать тест',
        'Создать попытку',
        'Ответить на вопрос верно',
        'Ответить на вопрос неверно',
        'Запросить подсказку AI',
        'Завершить попытку',
        'Оценить попытку через grade',
        'Получить результат оценки',
        'Снять тест с публикации',
        'Удалить вопросы',
        'Удалить тест',
    ],
    'publish-without-questions': [
        'Создать тест',
        'Попробовать опубликовать без вопросов (ожидаем отказ)',
        'Добавить вопрос',
        'Опубликовать тест',
        'Снять тест с публикации',
        'Удалить вопрос',
        'Удалить тест',
    ],
    'draft-flow': [
        'Создать тест',
        'Обновить параметры теста',
        'Добавить вопросы',
        'Переупорядочить вопросы',
        'Обновить один вопрос',
        'Удалить один вопрос',
        'Удалить тест',
    ],
});

// Сопоставление шагов сценария с выполненными автотестами по идентификаторам
export const SCENARIO_STEP_MATCHERS = Object.freeze({
    'full-cycle': [
        { label: 'Создать тест', matchers: ['scenario-full-create'] },
        { label: 'Добавить вопросы', matchers: ['scenario-full-question-*'] },
        { label: 'Опубликовать тест', matchers: ['scenario-full-publish'] },
        { label: 'Создать попытку', matchers: ['scenario-full-attempt'] },
        { label: 'Ответить на вопросы', matchers: ['scenario-full-answer-*'] },
        { label: 'Запросить подсказку AI', matchers: ['scenario-full-hint'] },
        { label: 'Завершить попытку', matchers: ['scenario-full-submit'] },
        { label: 'Получить результат', matchers: ['scenario-full-result'] },
        { label: 'Снять с публикации', matchers: ['scenario-full-unpublish'] },
        {
            label: 'Удалить вопросы и тест',
            matchers: ['scenario-full-delete-question-*', 'scenario-full-delete-test'],
        },
    ],
    'test-create-flow': [
        { label: 'Создать тест', matchers: ['scenario-create-test'] },
        {
            label: 'Добавить 4 вопроса разных типов (один с картинкой)',
            matchers: ['scenario-create-media', 'scenario-create-question-*'],
        },
        { label: 'Опубликовать тест', matchers: ['scenario-create-publish'] },
        { label: 'Снять тест с публикации', matchers: ['scenario-create-unpublish'] },
        { label: 'Обновить параметры теста', matchers: ['scenario-create-update-test'] },
        { label: 'Изменить старые вопросы', matchers: ['scenario-create-update-question-*'] },
        { label: 'Добавить 3 новых вопроса', matchers: ['scenario-create-extra-question-*'] },
        { label: 'Опубликовать тест повторно', matchers: ['scenario-create-publish-again'] },
        { label: 'Снять тест с публикации', matchers: ['scenario-create-unpublish-again'] },
        { label: 'Удалить вопросы', matchers: ['scenario-create-delete-question-*'] },
        { label: 'Удалить тест', matchers: ['scenario-create-delete-test'] },
    ],
    'test-pass-flow': [
        { label: 'Создать тест', matchers: ['scenario-pass-test'] },
        {
            label: 'Добавить 4 вопроса разных типов (один с картинкой)',
            matchers: ['scenario-pass-media', 'scenario-pass-question-*'],
        },
        { label: 'Опубликовать тест', matchers: ['scenario-pass-publish'] },
        { label: 'Создать попытку', matchers: ['scenario-pass-attempt'] },
        { label: 'Ответить на вопрос верно', matchers: ['scenario-pass-answer-correct'] },
        {
            label: 'Ответить на вопрос неверно',
            matchers: ['scenario-pass-answer-wrong', 'scenario-pass-answer-*'],
        },
        { label: 'Запросить подсказку AI', matchers: ['scenario-pass-ai-hint'] },
        { label: 'Завершить попытку', matchers: ['scenario-pass-submit'] },
        { label: 'Оценить попытку через grade', matchers: ['scenario-pass-grade'] },
        { label: 'Получить результат оценки', matchers: ['scenario-pass-result'] },
        { label: 'Снять тест с публикации', matchers: ['scenario-pass-unpublish'] },
        { label: 'Удалить вопросы', matchers: ['scenario-pass-delete-question-*'] },
        { label: 'Удалить тест', matchers: ['scenario-pass-delete-test'] },
    ],
    'publish-without-questions': [
        { label: 'Создать тест', matchers: ['scenario-publish-create'] },
        {
            label: 'Попробовать опубликовать без вопросов (ожидаем отказ)',
            matchers: ['scenario-publish-without-questions'],
        },
        { label: 'Добавить вопрос', matchers: ['scenario-publish-question-*'] },
        { label: 'Опубликовать тест', matchers: ['scenario-publish-success'] },
        { label: 'Снять тест с публикации', matchers: ['scenario-publish-unpublish'] },
        { label: 'Удалить вопрос', matchers: ['scenario-publish-delete-question-*'] },
        { label: 'Удалить тест', matchers: ['scenario-publish-delete-test'] },
    ],
    'draft-flow': [
        { label: 'Создать тест', matchers: ['scenario-draft-create'] },
        { label: 'Обновить параметры теста', matchers: ['scenario-draft-update'] },
        { label: 'Добавить вопросы', matchers: ['scenario-draft-question-*'] },
        { label: 'Переупорядочить вопросы', matchers: ['scenario-draft-reorder'] },
        { label: 'Обновить один вопрос', matchers: ['scenario-draft-update-question'] },
        { label: 'Удалить один вопрос', matchers: ['scenario-draft-delete-question'] },
        { label: 'Удалить тест', matchers: ['scenario-draft-delete-test'] },
    ],
});

/**
 * Возвращает ожидаемое количество шагов для сценария
 * @param {string} scenarioId - Идентификатор сценария
 * @returns {number} Ожидаемое количество шагов
 */
export const getScenarioExpectedTotal = (scenarioId) =>
    SCENARIO_EXPECTED_TOTALS[scenarioId] ?? 0;

/**
 * Возвращает определения шагов сценария
 * @param {string} scenarioId - Идентификатор сценария
 * @returns {Array} Массив шагов с подписями и матчерами
 */
export const getScenarioStepDefinitions = (scenarioId) => {
    const custom = SCENARIO_STEP_MATCHERS[scenarioId];
    if (custom) return custom;

    return (SCENARIO_STEPS[scenarioId] || []).map((label) => ({
        label,
        matchers: [],
    }));
};

/**
 * Проверяет, соответствует ли результат одному из шагов сценария
 * @param {Object} item - Результат автотеста
 * @param {Array} matchers - Массив матчеров (строки или функции)
 * @returns {boolean} true, если результат соответствует шагу
 */
export const matchScenarioStepResult = (item, matchers) => {
    if (!item || !matchers?.length) return false;

    const id = String(item.id || '');
    if (!id) return false;

    return matchers.some((matcher) => {
        if (!matcher) return false;
        if (typeof matcher === 'function') return Boolean(matcher(item));

        const raw = String(matcher);
        if (raw.endsWith('*')) {
            return id.startsWith(raw.slice(0, -1));
        }

        return id === raw;
    });
};

/**
 * Формирует сводную статистику по шагам сценария
 * @param {Array} items - Массив результатов
 * @returns {Object} Сводка: total, success, failed, skipped
 */
export const buildScenarioStepSummary = (items) => {
    const summary = {
        total: items.length,
        success: 0,
        failed: 0,
        skipped: 0,
    };

    items.forEach((item) => {
        if (item.status === 'success') summary.success += 1;
        else if (item.status === 'failed') summary.failed += 1;
        else if (item.status === 'skipped') summary.skipped += 1;
    });

    return summary;
};

/**
 * Определения сценариев с метаданными
 */
export const SCENARIO_DEFINITIONS = [
    {
        id: 'full-cycle',
        title: 'Полный цикл теста',
        tag: 'E2E',
        description: 'Создание теста, вопросы, публикация, прохождение, результат и очистка.',
    },
    {
        id: 'test-create-flow',
        title: 'Сценарий создания теста',
        tag: 'Создание',
        description:
            'Создание теста, 4 вопроса разных типов с медиа-добавлениями, публикация, правки и повторная публикация.',
    },
    {
        id: 'test-pass-flow',
        title: 'Сценарий прохождения теста',
        tag: 'Прохождение',
        description:
            'Создание теста, попытка и ответы (верные/неверные), подсказка AI, оценка, результат и очистка.',
    },
    {
        id: 'publish-without-questions',
        title: 'Публикация без вопросов',
        tag: 'Негативный',
        description:
            'Проверяем отказ публикации, затем корректную публикацию после добавления вопроса.',
    },
    {
        id: 'draft-flow',
        title: 'Черновик и правки',
        tag: 'Редактирование',
        description:
            'Работа с черновиком: обновления, порядок вопросов и удаление.',
    },
].map((scenario) => ({
    ...scenario,
    steps: SCENARIO_STEPS[scenario.id] || [],
    expectedTotal: getScenarioExpectedTotal(scenario.id),
}));
