/**
 * Утилиты
 */

// Форматирование
export {
    formatToken,
    formatResponse,
    formatDateTime,
    formatBodyExample,
    limitAutoTestMessage,
    formatAutoTestResponse,
    formatSelectedFiles,
    calcPercent,
    getAutoTestStatusLabel,
    buildConicGradient,
} from './formatters.js';

// Swagger
export {
    normalizePathParams,
    makeEndpointKey,
    makeDocsKey,
    normalizeBaseUrl,
    getSwaggerUrl,
    pickJsonContent,
    resolveSchemaRef,
    buildSchemaTemplate,
    extractExampleFromContent,
    extractRequestExample,
    isBinarySchema,
    isBinaryArraySchema,
    extractUploadMeta,
    isDownloadContentType,
    extractDownloadMeta,
    resolveAuthRequired,
    buildSwaggerGroups,
    buildEndpointMeta,
    isSameEndpointMeta,
    buildPathLabel,
} from './swagger.js';

// автотесты
export {
    sleep,
    normalizeExpectedStatuses,
    isBinaryPayload,
    normalizeAutoTestResponseData,
    makeResultRowKey,
    runStepWithRetries,
    createSampleImageFile,
    buildQuestionPayload,
    buildQuestionRecord,
    buildAnswerPayload,
    buildIncorrectAnswerPayload,
    getQuestionId,
} from './autotest.js';

// Keycloak
export {
    normalizeSessionClients,
    resolveCredentialLabel,
    resolveOtpSecret,
    resolveOtpQrSource,
    normalizeOtpQrSource,
    buildAccountProfilePayload,
} from './keycloak.js';

// File
export {
    parseContentDispositionFileName,
    buildDownloadFileName,
    toBlob,
    triggerDownload,
    appendFormValue,
} from './files.js';
