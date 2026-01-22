/**
 * Индекс констант — переэкспорт всех констант
 */

// Константы API
export {
    METHODS,
    HTTP_METHODS,
    SWAGGER_PATH,
    JSON_CONTENT_TYPES,
    DOWNLOAD_CONTENT_TYPES,
    DEFAULT_UPLOAD_FIELD,
    DEFAULT_ENDPOINT_META,
    AUTH_OPTIONS,
    USER_SOURCE_LABELS,
    DEFAULT_REQUEST,
} from './api.js';

// Константы автотестов
export {
    QUESTION_TYPES,
    MAX_AUTOTEST_MESSAGE_LENGTH,
    AUTO_TEST_RETRY_LIMIT,
    AUTO_TEST_RETRY_DELAY_MS,
    AUTO_TEST_FIXED_STEP_COUNT,
    AUTO_TEST_PER_QUESTION_STEP_COUNT,
    buildAutoTestQuestions,
} from './autotest.js';

// Константы сценариев
export {
    SCENARIO_EXPECTED_TOTALS,
    SCENARIO_STEPS,
    SCENARIO_STEP_MATCHERS,
    SCENARIO_DEFINITIONS,
    getScenarioExpectedTotal,
    getScenarioStepDefinitions,
    matchScenarioStepResult,
    buildScenarioStepSummary,
} from './scenarios.js';

// Резервные эндпоинты
export {
    API_DOCS_MAP,
    FALLBACK_ENDPOINT_GROUPS,
} from './endpoints.js';

// Переэкспорт makeDocsKey из utils для удобства
export { makeDocsKey } from '../utils/swagger.js';
