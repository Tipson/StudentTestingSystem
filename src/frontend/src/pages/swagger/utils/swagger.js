/**
 * Утилиты для парсинга Swagger и работы с эндпоинтами
 */
import { AUTH } from '@api/auth.js';
import {
    HTTP_METHODS,
    SWAGGER_PATH,
    JSON_CONTENT_TYPES,
    DOWNLOAD_CONTENT_TYPES,
    DEFAULT_UPLOAD_FIELD,
    DEFAULT_ENDPOINT_META,
} from '../constants/api.js';

/**
 * Нормализует параметры пути для сопоставления
 * @param {string} path - API-путь с параметрами
 * @returns {string} Нормализованный путь с плейсхолдерами {}
 */
export const normalizePathParams = (path) => (path ? path.replace(/\{[^}]+\}/g, '{}') : '');

/**
 * Формирует ключ эндпоинта для поиска
 * @param {string} service - Имя сервиса
 * @param {string} method - HTTP-метод
 * @param {string} path - API-путь
 * @returns {string} Уникальный ключ
 */
export const makeEndpointKey = (service, method, path) =>
    `${service || 'unknown'}::${method}::${path}`;

/**
 * Формирует ключ документации для сопоставления
 * @param {string} service - Имя сервиса
 * @param {string} method - HTTP-метод
 * @param {string} path - API-путь
 * @returns {string} Нормализованный ключ для поиска в документации
 */
export const makeDocsKey = (service, method, path) =>
    `${service || 'unknown'}::${method}::${normalizePathParams(path)}`;

/**
 * Нормализует base URL (убирает завершающий слэш)
 * @param {string} value - URL для нормализации
 * @returns {string} Нормализованный URL
 */
export const normalizeBaseUrl = (value) => {
    if (!value) return '';
    return value.replace(/\/$/, '');
};

/**
 * Возвращает URL Swagger JSON на основе base URL
 * @param {string} baseUrl - Base URL сервиса
 * @returns {string} Полный URL Swagger
 */
export const getSwaggerUrl = (baseUrl) => {
    const normalized = normalizeBaseUrl(baseUrl);
    return normalized ? `${normalized}${SWAGGER_PATH}` : '';
};

/**
 * Выбирает JSON content-type из карты content
 * @param {Object} content - Карта content-type из Swagger
 * @returns {{contentType: string, entry: Object}|null} Запись content-type или null
 */
export const pickJsonContent = (content) => {
    if (!content) return null;

    for (const contentType of JSON_CONTENT_TYPES) {
        if (content[contentType]) {
            return { contentType, entry: content[contentType] };
        }
    }

    return null;
};

/**
 * Разворачивает ссылку на схему ($ref)
 * @param {Object} schema - Объект схемы (может содержать $ref)
 * @param {Object} components - Компоненты Swagger
 * @returns {Object} Разрешённая схема
 */
export const resolveSchemaRef = (schema, components) => {
    if (!schema || !schema.$ref) return schema;
    const refKey = schema.$ref.split('/').pop();
    return components?.schemas?.[refKey] ?? schema;
};

/**
 * Строит шаблон тела запроса на основе schema
 * @param {Object} schema - JSON schema
 * @param {Object} components - Компоненты Swagger
 * @param {number} depth - Текущая глубина рекурсии
 * @returns {*} Значение шаблона
 */
export const buildSchemaTemplate = (schema, components, depth = 0) => {
    if (!schema || depth > 4) return null;

    const resolved = resolveSchemaRef(schema, components);
    if (!resolved) return null;

    if (resolved.example !== undefined) return resolved.example;
    if (resolved.default !== undefined) return resolved.default;
    if (Array.isArray(resolved.enum) && resolved.enum.length) return resolved.enum[0];

    if (Array.isArray(resolved.oneOf) && resolved.oneOf.length) {
        return buildSchemaTemplate(resolved.oneOf[0], components, depth + 1);
    }
    if (Array.isArray(resolved.anyOf) && resolved.anyOf.length) {
        return buildSchemaTemplate(resolved.anyOf[0], components, depth + 1);
    }
    if (Array.isArray(resolved.allOf) && resolved.allOf.length) {
        const merged = {};

        resolved.allOf.forEach((entry) => {
            const value = buildSchemaTemplate(entry, components, depth + 1);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(merged, value);
            }
        });

        return Object.keys(merged).length ? merged : null;
    }

    switch (resolved.type) {
        case 'object': {
            const template = {};
            const properties = resolved.properties || {};

            Object.entries(properties).forEach(([key, value]) => {
                const propTemplate = buildSchemaTemplate(value, components, depth + 1);
                template[key] = propTemplate === undefined ? null : propTemplate;
            });

            return template;
        }
        case 'array': {
            const itemTemplate = buildSchemaTemplate(resolved.items, components, depth + 1);
            return itemTemplate === null ? [] : [itemTemplate];
        }
        case 'string':
            return 'string';
        case 'integer':
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'null':
            return null;
        default:
            return null;
    }
};

/**
 * Извлекает пример (example) из записи content
 * @param {Object} entry - Запись content-type
 * @returns {*} Значение примера или null
 */
export const extractExampleFromContent = (entry) => {
    if (!entry) return null;

    if (entry.example !== undefined) {
        return entry.example;
    }

    if (entry.examples) {
        const firstExample = Object.values(entry.examples)[0];
        if (firstExample?.value !== undefined) {
            return firstExample.value;
        }
    }

    return null;
};

/**
 * Извлекает пример тела запроса (requestBody)
 * @param {Object} requestBody - Схема requestBody
 * @param {Object} components - Компоненты Swagger
 * @returns {*} Значение примера или null
 */
export const extractRequestExample = (requestBody, components) => {
    if (!requestBody?.content) return null;

    const jsonContent = pickJsonContent(requestBody.content);
    if (!jsonContent) return null;

    const directExample = extractExampleFromContent(jsonContent.entry);
    if (directExample !== null && directExample !== undefined) {
        return directExample;
    }

    const schema = resolveSchemaRef(jsonContent.entry.schema, components);
    if (schema?.example !== undefined) return schema.example;
    if (schema?.default !== undefined) return schema.default;

    const template = buildSchemaTemplate(schema, components);
    return template === null || template === undefined ? null : template;
};

/**
 * Проверяет, описывает ли schema бинарные данные
 * @param {Object} schema - JSON schema
 * @returns {boolean} true, если бинарные данные
 */
export const isBinarySchema = (schema) => schema?.type === 'string' && schema.format === 'binary';

/**
 * Проверяет, описывает ли schema массив бинарных данных
 * @param {Object} schema - JSON schema
 * @returns {boolean} true, если массив бинарных данных
 */
export const isBinaryArraySchema = (schema) => schema?.type === 'array' && isBinarySchema(schema.items);

/**
 * Извлекает метаданные загрузки файла из requestBody
 * @param {Object} requestBody - Схема requestBody
 * @param {Object} components - Компоненты Swagger
 * @param {string} path - API-путь
 * @returns {Object|null} Метаданные загрузки или null
 */
export const extractUploadMeta = (requestBody, components, path) => {
    const formContent = requestBody?.content?.['multipart/form-data'];
    if (!formContent) return null;

    const schema = resolveSchemaRef(formContent.schema, components);
    const requiredFields = Array.isArray(schema?.required) ? schema.required : [];

    if (schema?.properties) {
        for (const [name, propSchema] of Object.entries(schema.properties)) {
            const resolved = resolveSchemaRef(propSchema, components);

            if (isBinarySchema(resolved)) {
                return {
                    fieldName: name,
                    multiple: false,
                    required: requiredFields.includes(name),
                };
            }
            if (isBinaryArraySchema(resolved)) {
                return {
                    fieldName: name,
                    multiple: true,
                    required: requiredFields.includes(name),
                };
            }
        }
    }

    if (isBinarySchema(schema)) {
        return { fieldName: 'file', multiple: false, required: true };
    }
    if (isBinaryArraySchema(schema)) {
        return { fieldName: DEFAULT_UPLOAD_FIELD, multiple: true, required: true };
    }

    if (path && /\/upload/i.test(path)) {
        return { fieldName: DEFAULT_UPLOAD_FIELD, multiple: true, required: false };
    }

    return null;
};

/**
 * Проверяет, указывает ли content-type на скачиваемый контент
 * @param {string} contentType - Заголовок content-type
 * @returns {boolean} true, если контент можно скачать
 */
export const isDownloadContentType = (contentType) => {
    if (!contentType) return false;
    const normalized = contentType.toLowerCase();

    if (DOWNLOAD_CONTENT_TYPES.includes(normalized)) return true;
    if (normalized.startsWith('image/')) return true;
    if (normalized.startsWith('video/')) return true;
    if (normalized.startsWith('audio/')) return true;

    return false;
};

/**
 * Определяет, возвращает ли эндпоинт скачиваемый контент (по responses)
 * @param {Object} responses - responses из Swagger
 * @param {string} path - API-путь
 * @returns {boolean} true, если эндпоинт отдаёт скачиваемый контент
 */
export const extractDownloadMeta = (responses, path) => {
    if (path && /\/download/i.test(path)) {
        return true;
    }

    if (!responses) return false;

    return Object.values(responses).some((response) =>
        Object.keys(response?.content || {}).some((contentType) => isDownloadContentType(contentType)),
    );
};

/**
 * Определяет, требуется ли авторизация для операции
 * @param {Object} operation - Операция Swagger
 * @param {Array} docSecurity - security на уровне документа
 * @returns {boolean} true, если нужна авторизация
 */
export const resolveAuthRequired = (operation, docSecurity) => {
    if (Array.isArray(operation?.security)) {
        return operation.security.length > 0;
    }
    if (Array.isArray(docSecurity)) {
        return docSecurity.length > 0;
    }
    return false;
};

/**
 * Строит группы эндпоинтов из Swagger-документа
 * @param {Object} swagger - Swagger-документ
 * @param {string} serviceKey - Идентификатор сервиса
 * @param {Map} docsMap - Map с документацией (описаниями)
 * @returns {Array} Массив групп эндпоинтов
 */
export const buildSwaggerGroups = (swagger, serviceKey, docsMap) => {
    if (!swagger?.paths) return [];

    const components = swagger.components ?? {};
    const docSecurity = Array.isArray(swagger.security) ? swagger.security : [];
    const serviceTitle = swagger.info?.title || serviceKey;
    const grouped = new Map();

    Object.entries(swagger.paths).forEach(([path, methods]) => {
        if (!methods) return;

        Object.entries(methods).forEach(([method, operation]) => {
            const normalizedMethod = method.toLowerCase();
            if (!HTTP_METHODS.has(normalizedMethod)) return;

            const methodUpper = normalizedMethod.toUpperCase();
            const docEntry = docsMap?.get(makeDocsKey(serviceKey, methodUpper, path));
            const operationTag =
                Array.isArray(operation?.tags) && operation.tags.length
                    ? operation.tags[0]
                    : docEntry?.group || 'Общее';
            const description = docEntry?.description || operation?.summary || operation?.description || '';
            const example = extractRequestExample(operation?.requestBody, components);
            const hasExample = example !== null && example !== undefined;
            const hasRequestBody = Boolean(operation?.requestBody);
            const authRequired = resolveAuthRequired(operation, docSecurity);
            const uploadMeta = extractUploadMeta(operation?.requestBody, components, path);
            const download = extractDownloadMeta(operation?.responses, path);

            const item = {
                method: methodUpper,
                path,
                description,
                example,
                hasExample,
                hasRequestBody,
                auth: authRequired ? AUTH.TRUE : AUTH.FALSE,
                service: serviceKey,
                upload: Boolean(uploadMeta),
                uploadField: uploadMeta?.fieldName ?? DEFAULT_UPLOAD_FIELD,
                uploadMultiple: uploadMeta?.multiple ?? false,
                uploadRequired: uploadMeta?.required ?? false,
                download,
            };

            if (!grouped.has(operationTag)) {
                grouped.set(operationTag, []);
            }

            grouped.get(operationTag).push(item);
        });
    });

    return Array.from(grouped.entries())
        .map(([tag, items]) => ({
            title: tag,
            service: serviceKey,
            serviceTitle,
            items: items.sort((a, b) => {
                if (a.path === b.path) {
                    return a.method.localeCompare(b.method);
                }
                return a.path.localeCompare(b.path);
            }),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));
};

/**
 * Собирает метаданные эндпоинта из item
 * @param {Object} item - Элемент эндпоинта
 * @returns {Object} Метаданные эндпоинта
 */
export const buildEndpointMeta = (item) => ({
    ...DEFAULT_ENDPOINT_META,
    upload: Boolean(item?.upload),
    uploadField: item?.uploadField || DEFAULT_UPLOAD_FIELD,
    uploadMultiple: Boolean(item?.uploadMultiple),
    uploadRequired: Boolean(item?.uploadRequired),
    download: Boolean(item?.download),
});

/**
 * Сравнивает два объекта метаданных эндпоинта
 * @param {Object} left - Первый объект метаданных
 * @param {Object} right - Второй объект метаданных
 * @returns {boolean} true, если равны
 */
export const isSameEndpointMeta = (left, right) => (
    left.upload === right.upload
    && left.uploadField === right.uploadField
    && left.uploadMultiple === right.uploadMultiple
    && left.uploadRequired === right.uploadRequired
    && left.download === right.download
);

/**
 * Формирует подпись пути для отображения
 * @param {Object} item - Элемент эндпоинта
 * @param {string} groupTitle - Название группы
 * @returns {string} Отформатированная подпись
 */
export const buildPathLabel = (item, groupTitle) => {
    const description = item?.description?.trim();
    const fallback = groupTitle && groupTitle !== 'General' ? groupTitle : '';
    const note = description || fallback;

    return note ? `${item.path} — ${note}` : item.path;
};
