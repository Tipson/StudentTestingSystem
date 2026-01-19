import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import {API_BASE_URLS} from '@api/config.js';
import {apiClients} from '@api/client.js';
import {AUTH, getAccessToken} from '@api/auth.js';
import {assessmentApiDocs, identifyApiDocs, mediaApiDocs} from '@api';
import testCatImage from './testCat.png';
import {notifyCustom} from '@shared/notifications/notificationCenter.js';
import {clearStoredTokens, getStoredTokens, startKeycloakLogin} from '@shared/auth/keycloak.js';
import './SwaggerPage.css';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);
const SWAGGER_PATH = '/swagger/v1/swagger.json';
const JSON_CONTENT_TYPES = ['application/json', 'text/json', 'application/*+json'];
const DOWNLOAD_CONTENT_TYPES = ['application/octet-stream', 'application/zip', 'application/pdf'];
const DEFAULT_UPLOAD_FIELD = 'files';

const DEFAULT_ENDPOINT_META = {
    upload: false,
    uploadField: DEFAULT_UPLOAD_FIELD,
    uploadMultiple: false,
    uploadRequired: false,
    download: false,
};

const AUTH_OPTIONS = [
    {value: AUTH.TRUE, label: 'Требуется'},
    {value: AUTH.OPTIONAL, label: 'Опционально'},
    {value: AUTH.FALSE, label: 'Без авторизации'},
];

const DEFAULT_REQUEST = {
    service: 'assessment',
    method: 'GET',
    path: '/healthz',
    auth: AUTH.FALSE,
    body: '',
};

const QUESTION_TYPES = Object.freeze({
    SingleChoice: 0,
    MultiChoice: 1,
    TrueFalse: 2,
    ShortText: 3,
    LongText: 4,
});

const MAX_AUTOTEST_MESSAGE_LENGTH = 600;
// Сколько раз повторять автотест при ошибке.
const AUTO_TEST_RETRY_LIMIT = 0;
const AUTO_TEST_RETRY_DELAY_MS = 500;

const normalizePathParams = (path) => (path ? path.replace(/\{[^}]+\}/g, '{}') : '');

const makeEndpointKey = (service, method, path) => `${service || 'unknown'}::${method}::${path}`;

const makeDocsKey = (service, method, path) =>
    `${service || 'unknown'}::${method}::${normalizePathParams(path)}`;

const API_DOCS = [
    ...assessmentApiDocs,
    ...mediaApiDocs,
    ...identifyApiDocs,
];

const API_DOCS_MAP = new Map();
API_DOCS.forEach((doc) => {
    if (!doc?.method || !doc?.path) return;
    API_DOCS_MAP.set(makeDocsKey(doc.service, doc.method, doc.path), doc);
});

const applyDocsToFallback = (groups) => groups.map((group) => {
    const serviceKey = group.service;

    return {
        ...group,
        items: group.items.map((item) => {
            const method = item.method?.toUpperCase?.() ?? item.method;
            const key = makeDocsKey(item.service || serviceKey, method, item.path);
            const doc = API_DOCS_MAP.get(key);

            return {
                ...item,
                description: item.description ?? doc?.description ?? '',
            };
        }),
    };
});

const FALLBACK_ENDPOINT_GROUPS = applyDocsToFallback([
    {
        title: 'Health',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            {method: 'GET', path: '/healthz', auth: AUTH.FALSE},
        ],
    },
    {
        title: 'AI',
        service: 'ai',
        serviceTitle: 'AI',
        items: [
            {method: 'POST', path: '/api/ai/attempts/{attemptId}/questions/{questionId}/hint'},
        ],
    },
    {
        title: 'Tests',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            {method: 'POST', path: '/api/tests'},
            {method: 'GET', path: '/api/tests'},
            {method: 'GET', path: '/api/tests/{id}'},
            {method: 'PUT', path: '/api/tests/{id}'},
            {method: 'DELETE', path: '/api/tests/{id}'},
            {method: 'GET', path: '/api/tests/my'},
            {method: 'PUT', path: '/api/tests/{id}/settings'},
            {method: 'PUT', path: '/api/tests/{id}/access-type/{accessType}'},
            {method: 'PUT', path: '/api/tests/{id}/availability'},
            {method: 'PUT', path: '/api/tests/{id}/publish'},
            {method: 'PUT', path: '/api/tests/{id}/unpublish'},
            {method: 'POST', path: '/api/tests/{testId}/access/users'},
            {method: 'POST', path: '/api/tests/{testId}/access/groups'},
            {method: 'POST', path: '/api/tests/{testId}/access/invite-links'},
            {method: 'GET', path: '/api/tests/{testId}/access'},
            {method: 'DELETE', path: '/api/tests/access/{accessId}'},
            {method: 'POST', path: '/api/tests/join/{inviteCode}'},
        ],
    },
    {
        title: 'Attempts',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            {method: 'POST', path: '/api/tests/{testId}/attempts'},
            {method: 'GET', path: '/api/tests/{testId}/attempts'},
            {method: 'GET', path: '/api/tests/{testId}/results'},
            {method: 'GET', path: '/api/attempts/{id}'},
            {
                method: 'PUT',
                path: '/api/attempts/{attemptId}/answers/{questionId}',
                example: {
                    optionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    optionIds: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
                    text: 'Пример ответа студента',
                },
            },
            {method: 'POST', path: '/api/attempts/{id}/submit'},
            {method: 'GET', path: '/api/attempts/{id}/result'},
            {method: 'GET', path: '/api/attempts/my'},
            {method: 'GET', path: '/api/attempts/pending-review'},
            {method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}/grade'},
        ],
    },
    {
        title: 'Questions',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            {method: 'POST', path: '/api/tests/{testId}/questions'},
            {method: 'GET', path: '/api/tests/{testId}/questions'},
            {method: 'GET', path: '/api/questions/{id}'},
            {method: 'PUT', path: '/api/questions/{id}'},
            {method: 'DELETE', path: '/api/questions/{id}'},
            {method: 'PUT', path: '/api/tests/{testId}/questions/reorder'},
        ],
    },
    {
        title: 'Files',
        service: 'media',
        serviceTitle: 'Media',
        items: [
            {
                method: 'POST',
                path: '/api/files/upload',
                upload: true,
                uploadField: DEFAULT_UPLOAD_FIELD,
                uploadMultiple: true,
                uploadRequired: true,
            },
            {method: 'POST', path: '/api/files/get'},
            {method: 'POST', path: '/api/files/download', download: true},
            {method: 'GET', path: '/api/files/my'},
            {method: 'POST', path: '/api/files/delete'},
        ],
    },
    {
        title: 'Groups',
        service: 'identify',
        serviceTitle: 'Identity',
        items: [
            {method: 'POST', path: '/api/groups'},
            {method: 'GET', path: '/api/groups'},
            {method: 'PUT', path: '/api/groups/{id}'},
            {method: 'DELETE', path: '/api/groups/{id}'},
            {method: 'PUT', path: '/api/groups/{id}/active'},
            {method: 'GET', path: '/api/groups/{id}/students'},
            {method: 'POST', path: '/api/groups/{id}/students'},
        ],
    },
    {
        title: 'Me',
        service: 'identify',
        serviceTitle: 'Identity',
        items: [
            {method: 'GET', path: '/api/me'},
            {method: 'PUT', path: '/api/me/group'},
            {method: 'DELETE', path: '/api/me/group'},
        ],
    },
]);

const formatToken = (token) => {
    if (!token) return '';
    return `${token.slice(0, 14)}...${token.slice(-10)}`;
};

const formatResponse = (payload) => {
    if (!payload || payload.data == null) return '';
    if (typeof payload.data === 'string') return payload.data;
    try {
        return JSON.stringify(payload.data, null, 2);
    } catch (error) {
        return String(payload.data);
    }
};

const normalizeBaseUrl = (value) => {
    if (!value) return '';
    return value.replace(/\/$/, '');
};

const getSwaggerUrl = (baseUrl) => {
    const normalized = normalizeBaseUrl(baseUrl);
    return normalized ? `${normalized}${SWAGGER_PATH}` : '';
};

const formatBodyExample = (example) => {
    if (example == null) return '';
    if (typeof example === 'string') {
        try {
            return JSON.stringify(JSON.parse(example), null, 2);
        } catch (error) {
            return JSON.stringify(example);
        }
    }
    try {
        return JSON.stringify(example, null, 2);
    } catch (error) {
        return String(example);
    }
};

const limitAutoTestMessage = (value) => {
    if (value == null) return '';
    const text = typeof value === 'string'
        ? value
        : value?.message
            ? value.message
            : formatBodyExample(value);

    if (text.length <= MAX_AUTOTEST_MESSAGE_LENGTH) return text;
    return `${text.slice(0, MAX_AUTOTEST_MESSAGE_LENGTH)}...`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createSampleImageFile = async () => {
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

const buildAutoTestQuestions = (label) => ([
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

const getAutoTestStatusLabel = (status) => {
    if (status === 'success') return 'Успешно';
    if (status === 'failed') return 'Ошибка';
    if (status === 'skipped') return 'Пропущено';
    return status || '';
};

const isBinarySchema = (schema) => schema?.type === 'string' && schema.format === 'binary';

const isBinaryArraySchema = (schema) => schema?.type === 'array' && isBinarySchema(schema.items);

const extractUploadMeta = (requestBody, components, path) => {
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
        return {fieldName: 'file', multiple: false, required: true};
    }
    if (isBinaryArraySchema(schema)) {
        return {fieldName: DEFAULT_UPLOAD_FIELD, multiple: true, required: true};
    }

    if (path && /\/upload/i.test(path)) {
        return {fieldName: DEFAULT_UPLOAD_FIELD, multiple: true, required: false};
    }

    return null;
};

const isDownloadContentType = (contentType) => {
    if (!contentType) return false;
    const normalized = contentType.toLowerCase();

    if (DOWNLOAD_CONTENT_TYPES.includes(normalized)) return true;
    if (normalized.startsWith('image/')) return true;
    if (normalized.startsWith('video/')) return true;
    if (normalized.startsWith('audio/')) return true;

    return false;
};

const extractDownloadMeta = (responses, path) => {
    if (path && /\/download/i.test(path)) {
        return true;
    }

    if (!responses) return false;

    return Object.values(responses).some((response) =>
        Object.keys(response?.content || {}).some((contentType) => isDownloadContentType(contentType)),
    );
};

const parseContentDispositionFileName = (value) => {
    if (!value) return '';

    const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        const rawValue = utfMatch[1].replace(/"/g, '');
        try {
            return decodeURIComponent(rawValue);
        } catch (error) {
            return rawValue;
        }
    }

    const match = value.match(/filename="?([^";]+)"?/i);
    return match?.[1] || '';
};

const buildDownloadFileName = (headers, path) => {
    const rawHeader = headers?.['content-disposition'] || headers?.['Content-Disposition'];
    const fileName = parseContentDispositionFileName(rawHeader);
    if (fileName) return fileName;

    const pathTail = path?.split('/').filter(Boolean).pop();
    return pathTail || `download-${Date.now()}`;
};

const toBlob = (data, headers) => {
    if (data instanceof Blob) return data;

    const contentType = headers?.['content-type'] || 'application/octet-stream';
    return new Blob([data], {type: contentType});
};

const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName || `download-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

const appendFormValue = (formData, key, value) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
        value.forEach((item) => appendFormValue(formData, key, item));
        return;
    }

    if (value instanceof Blob) {
        formData.append(key, value);
        return;
    }

    if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
    }

    formData.append(key, String(value));
};

const formatSelectedFiles = (files) => files.map((file) => file.name).join(', ');

const pickJsonContent = (content) => {
    if (!content) return null;

    for (const contentType of JSON_CONTENT_TYPES) {
        if (content[contentType]) {
            return {contentType, entry: content[contentType]};
        }
    }

    return null;
};

const resolveSchemaRef = (schema, components) => {
    if (!schema || !schema.$ref) return schema;
    const refKey = schema.$ref.split('/').pop();
    return components?.schemas?.[refKey] ?? schema;
};

// Собирает шаблон тела запроса из JSON-схемы Swagger.
const buildSchemaTemplate = (schema, components, depth = 0) => {
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

const extractExampleFromContent = (entry) => {
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

const extractRequestExample = (requestBody, components) => {
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

const resolveAuthRequired = (operation, docSecurity) => {
    if (Array.isArray(operation?.security)) {
        return operation.security.length > 0;
    }
    if (Array.isArray(docSecurity)) {
        return docSecurity.length > 0;
    }
    return false;
};

// Собирает группы эндпоинтов из Swagger-описания.
const buildSwaggerGroups = (swagger, serviceKey, docsMap) => {
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
            const operationTag = Array.isArray(operation?.tags) && operation.tags.length
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

const buildEndpointMeta = (item) => ({
    ...DEFAULT_ENDPOINT_META,
    upload: Boolean(item?.upload),
    uploadField: item?.uploadField || DEFAULT_UPLOAD_FIELD,
    uploadMultiple: Boolean(item?.uploadMultiple),
    uploadRequired: Boolean(item?.uploadRequired),
    download: Boolean(item?.download),
});

const isSameEndpointMeta = (left, right) => (
    left.upload === right.upload
    && left.uploadField === right.uploadField
    && left.uploadMultiple === right.uploadMultiple
    && left.uploadRequired === right.uploadRequired
    && left.download === right.download
);

const buildPathLabel = (item, groupTitle) => {
    const description = item?.description?.trim();
    const fallback = groupTitle && groupTitle !== 'General' ? groupTitle : '';
    const note = description || fallback;

    return note ? `${item.path} — ${note}` : item.path;
};

export default function SwaggerPage() {
    const [tokens, setTokens] = useState(() => getStoredTokens());
    const serviceEntries = useMemo(
        () => Object.entries(API_BASE_URLS)
            .filter(([, url]) => Boolean(url))
            .map(([key, url]) => ({key, url})),
        [],
    );
    const swaggerSources = useMemo(() => {
        const unique = new Map();

        serviceEntries.forEach((entry) => {
            const normalized = normalizeBaseUrl(entry.url);
            if (!normalized) return;

            if (!unique.has(normalized)) {
                unique.set(normalized, {key: entry.key, url: normalized});
            }
        });

        return Array.from(unique.values());
    }, [serviceEntries]);
    const [request, setRequest] = useState(() => ({
        ...DEFAULT_REQUEST,
        service: serviceEntries[0]?.key || DEFAULT_REQUEST.service,
    }));
    const [response, setResponse] = useState(null);
    const [pending, setPending] = useState(false);
    const [swaggerGroups, setSwaggerGroups] = useState([]);
    const [swaggerLoading, setSwaggerLoading] = useState(false);
    const [swaggerErrors, setSwaggerErrors] = useState([]);
    const [activeTab, setActiveTab] = useState('console');
    const [autoTestRunning, setAutoTestRunning] = useState(false);
    const [autoTestResults, setAutoTestResults] = useState([]);
    const [endpointMeta, setEndpointMeta] = useState(DEFAULT_ENDPOINT_META);
    const [uploadFiles, setUploadFiles] = useState([]);
    const lastAppliedKeyRef = useRef('');

    const endpointGroups = swaggerGroups.length ? swaggerGroups : FALLBACK_ENDPOINT_GROUPS;
    // Группируем эндпоинты по сервисам для удобного отображения.
    const serviceGroups = useMemo(() => {
        const grouped = new Map();

        endpointGroups.forEach((group) => {
            const serviceKey = group.service || DEFAULT_REQUEST.service;
            const serviceTitle = group.serviceTitle || serviceKey;
            const groupTitle = group.title || 'General';

            if (!grouped.has(serviceKey)) {
                grouped.set(serviceKey, {
                    serviceKey,
                    serviceTitle,
                    groups: [],
                });
            }

            grouped.get(serviceKey).groups.push({
                ...group,
                title: groupTitle,
                service: serviceKey,
                serviceTitle,
            });
        });

        return Array.from(grouped.values())
            .map((service) => ({
                ...service,
                groups: service.groups.sort((a, b) => a.title.localeCompare(b.title)),
            }))
            .sort((a, b) => a.serviceTitle.localeCompare(b.serviceTitle));
    }, [endpointGroups]);
    const pathOptions = useMemo(() => {
        const options = [];

        serviceGroups.forEach((service) => {
            if (service.serviceKey !== request.service) return;

            service.groups.forEach((group) => {
                const groupTitle = group.title || 'General';

                group.items.forEach((item) => {
                    if (item.method !== request.method) return;

                    options.push({
                        value: item.path,
                        label: buildPathLabel(item, groupTitle),
                        item,
                    });
                });
            });
        });

        const unique = new Map();
        options.forEach((option) => {
            if (!unique.has(option.value)) {
                unique.set(option.value, option);
            }
        });

        return Array.from(unique.values()).sort((a, b) => a.value.localeCompare(b.value));
    }, [request.method, request.service, serviceGroups]);
    const selectedFilesLabel = useMemo(() => formatSelectedFiles(uploadFiles), [uploadFiles]);
    const autoTestSummary = useMemo(() => {
        const summary = {total: autoTestResults.length, success: 0, failed: 0, skipped: 0};

        autoTestResults.forEach((item) => {
            if (item.status === 'success') summary.success += 1;
            else if (item.status === 'failed') summary.failed += 1;
            else if (item.status === 'skipped') summary.skipped += 1;
        });

        return summary;
    }, [autoTestResults]);

    const applyEndpoint = useCallback((item, serviceKey) => {
        const nextBody = item.example != null
            ? formatBodyExample(item.example)
            : item.hasRequestBody
                ? ''
                : '';
        const nextMeta = buildEndpointMeta(item);
        const nextKey = makeEndpointKey(serviceKey, item.method, item.path);

        setEndpointMeta(nextMeta);
        setUploadFiles([]);
        lastAppliedKeyRef.current = nextKey;
        setRequest((prev) => ({
            ...prev,
            service: serviceKey,
            method: item.method,
            path: item.path,
            auth: item.auth ?? prev.auth,
            body: nextBody,
        }));
    }, []);

    // Сбрасываем путь и метаданные, если текущий путь не подходит под выбранные сервис/метод.
    useEffect(() => {
        if (!request.path) {
            lastAppliedKeyRef.current = '';
            setEndpointMeta((prev) => (
                isSameEndpointMeta(prev, DEFAULT_ENDPOINT_META) ? prev : DEFAULT_ENDPOINT_META
            ));
            return;
        }

        const matched = pathOptions.find((option) => option.value === request.path);

        if (!matched) {
            lastAppliedKeyRef.current = '';
            setEndpointMeta((prev) => (
                isSameEndpointMeta(prev, DEFAULT_ENDPOINT_META) ? prev : DEFAULT_ENDPOINT_META
            ));
            setUploadFiles([]);
            setRequest((prev) => ({...prev, path: '', body: ''}));
            return;
        }

        const nextKey = makeEndpointKey(request.service, request.method, request.path);
        if (lastAppliedKeyRef.current === nextKey) return;

        lastAppliedKeyRef.current = nextKey;
        applyEndpoint(matched.item, request.service);
    }, [applyEndpoint, pathOptions, request.method, request.path, request.service]);

    const hasToken = Boolean(tokens?.accessToken);
    const tokenLabel = hasToken
        ? 'Токен сохранен'
        : 'Токен не найден';
    const tokenPreview = hasToken ? formatToken(tokens.accessToken) : '';
    const tokenExpiresAt = tokens?.expiresAt
        ? new Date(tokens.expiresAt).toLocaleString('ru-RU')
        : '';

    // Загружает Swagger и формирует список эндпоинтов.
    const loadSwagger = useCallback(async () => {
        if (!swaggerSources.length) {
            setSwaggerGroups([]);
            setSwaggerErrors([]);
            return;
        }

        setSwaggerLoading(true);
        setSwaggerErrors([]);

        const token = getAccessToken();
        const headers = token ? {Authorization: `Bearer ${token}`} : undefined;
        const requests = swaggerSources.map((source) => {
            const swaggerUrl = getSwaggerUrl(source.url);
            return axios.get(swaggerUrl, {headers});
        });
        const results = await Promise.allSettled(requests);
        const nextGroups = [];
        const nextErrors = [];

        results.forEach((result, index) => {
            const source = swaggerSources[index];

            if (result.status === 'fulfilled') {
                nextGroups.push(...buildSwaggerGroups(result.value?.data, source.key, API_DOCS_MAP));
            } else {
                nextErrors.push(source.key);
            }
        });

        if (nextGroups.length) {
            setSwaggerGroups(nextGroups);
        } else {
            setSwaggerGroups([]);
        }

        setSwaggerErrors(nextErrors);

        if (nextErrors.length) {
            notifyCustom({
                type: 'warning',
                message: `Не удалось загрузить Swagger для: ${nextErrors.join(', ')}`,
                duration: 3200,
            });
        }

        setSwaggerLoading(false);
    }, [swaggerSources]);

    useEffect(() => {
        loadSwagger();
    }, [loadSwagger]);

    const handleLogin = async () => {
        await startKeycloakLogin();
    };

    const handleLogout = () => {
        clearStoredTokens();
        setTokens(null);
    };

    const handleCopyToken = async () => {
        if (!tokens?.accessToken) {
            notifyCustom({
                type: 'warning',
                message: 'Нет токена для копирования.',
                duration: 2400,
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(tokens.accessToken);
            notifyCustom({
                type: 'success',
                message: 'Токен скопирован.',
                duration: 2000,
            });
        } catch (error) {
            notifyCustom({
                type: 'error',
                message: 'Не удалось скопировать токен.',
                duration: 2400,
            });
        }
    };

    const handleFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        setUploadFiles(files);
    };

    const handleClearFiles = () => {
        setUploadFiles([]);
    };

    const handleEndpointClick = (item, groupService) => {
        const serviceKey = item.service || groupService || DEFAULT_REQUEST.service;
        applyEndpoint(item, serviceKey);
    };

    const handleServiceChange = (event) => {
        const value = event.target.value;
        setRequest((prev) => ({...prev, service: value}));
    };

    const handleMethodChange = (event) => {
        const value = event.target.value;
        setRequest((prev) => ({...prev, method: value}));
    };

    const handlePathChange = (event) => {
        const value = event.target.value;
        if (!value) {
            lastAppliedKeyRef.current = '';
            setEndpointMeta((prev) => (
                isSameEndpointMeta(prev, DEFAULT_ENDPOINT_META) ? prev : DEFAULT_ENDPOINT_META
            ));
            setUploadFiles([]);
            setRequest((prev) => ({...prev, path: '', body: ''}));
            return;
        }

        const matched = pathOptions.find((option) => option.value === value);
        if (!matched) return;

        applyEndpoint(matched.item, request.service);
    };

    // Последовательный автотест для основных API сценариев.
    const runAutoTests = async () => {
        if (autoTestRunning) return;

        setAutoTestRunning(true);
        setAutoTestResults([]);

        const runLabel = new Date().toLocaleString('ru-RU');
        const ctx = {
            assessment: apiClients.assessment,
            media: apiClients.media,
            identify: apiClients.identify,
            ai: apiClients.ai,
            values: {
                runLabel,
                testId: null,
                attemptId: null,
                userId: null,
                groupId: null,
                inviteCode: null,
                accessId: null,
                questions: [],
                mediaIds: [],
                isPublished: false, // Флаг для проверки публикации в автотестах.
            },
        };

        const pushResult = (result) => {
            setAutoTestResults((prev) => [...prev, result]);
        };

        const runStep = async (step) => {
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
                return;
            }

            const startedAt = Date.now();
            const retryLimit = Math.max(0, step.retries ?? AUTO_TEST_RETRY_LIMIT);
            let attempt = 0;
            let lastError = null;

            while (attempt <= retryLimit) {
                attempt += 1;
                try {
                    const response = await step.run(ctx);
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
                    });
                    return;
                } catch (error) {
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
            });
        };

        const getQuestionId = (question) => question?.id ?? question?.Id ?? null;

        const buildAnswerPayload = (question) => {
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

        try {
            await runStep({
                id: 'health',
                title: 'GET /healthz',
                service: 'assessment',
                method: 'GET',
                path: '/healthz',
                run: () => ctx.assessment.get('/healthz', {auth: AUTH.FALSE}),
            });

            await runStep({
                id: 'me',
                title: 'GET /api/me',
                service: 'identify',
                method: 'GET',
                path: '/api/me',
                run: () => ctx.identify.get('/api/me', {auth: AUTH.TRUE}),
                onSuccess: (response) => {
                    ctx.values.userId = response?.data?.id ?? response?.data?.Id ?? null;
                },
                getMessage: () => (ctx.values.userId ? `userId=${ctx.values.userId}` : ''),
            });

            await runStep({
                id: 'groups-list',
                title: 'GET /api/groups',
                service: 'identify',
                method: 'GET',
                path: '/api/groups',
                run: () => ctx.identify.get('/api/groups', {auth: AUTH.OPTIONAL}),
            });

            await runStep({
                id: 'groups-create',
                title: 'POST /api/groups',
                service: 'identify',
                method: 'POST',
                path: '/api/groups',
                run: () => ctx.identify.post(
                    '/api/groups',
                    {
                        institution: `Институт информационных технологий ${runLabel}`,
                        specialization: 'Программная инженерия',
                        course: 2,
                        groupNumber: 203,
                    },
                    {auth: AUTH.TRUE},
                ),
                onSuccess: (response) => {
                    ctx.values.groupId = response?.data ?? null;
                },
                getMessage: () => (ctx.values.groupId ? `groupId=${ctx.values.groupId}` : ''),
            });

            await runStep({
                id: 'groups-update',
                title: 'PUT /api/groups/{id}',
                service: 'identify',
                method: 'PUT',
                path: '/api/groups/{id}',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для обновления.' : ''),
                run: () => {
                    const body = JSON.stringify(`Институт прикладной математики ${runLabel}`);
                    return ctx.identify.put(
                        `/api/groups/${ctx.values.groupId}`,
                        body,
                        {
                            auth: AUTH.TRUE,
                            headers: {'Content-Type': 'application/json'},
                            params: {
                                specialization: 'Информационная безопасность',
                                course: 3,
                                groupNumber: 312,
                            },
                        },
                    );
                },
            });

            await runStep({
                id: 'groups-active',
                title: 'PUT /api/groups/{id}/active',
                service: 'identify',
                method: 'PUT',
                path: '/api/groups/{id}/active',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для смены активности.' : ''),
                run: () => {
                    const body = JSON.stringify(true);
                    return ctx.identify.put(
                        `/api/groups/${ctx.values.groupId}/active`,
                        body,
                        {
                            auth: AUTH.TRUE,
                            headers: {'Content-Type': 'application/json'},
                        },
                    );
                },
            });

            await runStep({
                id: 'groups-students',
                title: 'GET /api/groups/{id}/students',
                service: 'identify',
                method: 'GET',
                path: '/api/groups/{id}/students',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для списка студентов.' : ''),
                run: () => ctx.identify.get(`/api/groups/${ctx.values.groupId}/students`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'groups-add-students',
                title: 'POST /api/groups/{id}/students',
                service: 'identify',
                method: 'POST',
                path: '/api/groups/{id}/students',
                skip: () => {
                    if (!ctx.values.groupId) return 'Нет groupId для добавления студентов.';
                    if (!ctx.values.userId) return 'Нет userId для добавления в группу.';
                    return '';
                },
                run: () => ctx.identify.post(
                    `/api/groups/${ctx.values.groupId}/students`,
                    [ctx.values.userId],
                    {auth: AUTH.TRUE},
                ),
            });

            await runStep({
                id: 'me-group',
                title: 'PUT /api/me/group',
                service: 'identify',
                method: 'PUT',
                path: '/api/me/group',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для выбора группы.' : ''),
                run: () => {
                    const body = JSON.stringify(ctx.values.groupId);
                    return ctx.identify.put(
                        '/api/me/group',
                        body,
                        {
                            auth: AUTH.TRUE,
                            headers: {'Content-Type': 'application/json'},
                        },
                    );
                },
            });

            await runStep({
                id: 'me-group-remove',
                title: 'DELETE /api/me/group',
                service: 'identify',
                method: 'DELETE',
                path: '/api/me/group',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для сброса группы.' : ''),
                run: () => ctx.identify.delete('/api/me/group', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-list',
                title: 'GET /api/tests',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests',
                run: () => ctx.assessment.get('/api/tests', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-my',
                title: 'GET /api/tests/my',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/my',
                run: () => ctx.assessment.get('/api/tests/my', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-create',
                title: 'POST /api/tests',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests',
                run: () => ctx.assessment.post(
                    '/api/tests',
                    {
                        title: `Промежуточный тест: основы Web API (${runLabel})`,
                        description: 'Проверка понимания HTTP, авторизации и базовых операций API. ' +
                            'Используется для автотестов и демонстрации сценариев.',
                    },
                    {auth: AUTH.TRUE},
                ),
                onSuccess: (response) => {
                    ctx.values.testId = response?.data?.id ?? response?.data?.Id ?? null;
                },
                getMessage: () => (ctx.values.testId ? `testId=${ctx.values.testId}` : ''),
            });

            await runStep({
                id: 'tests-get',
                title: 'GET /api/tests/{id}',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/{id}',
                skip: () => (!ctx.values.testId ? 'Нет testId для запроса.' : ''),
                run: () => ctx.assessment.get(`/api/tests/${ctx.values.testId}`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-update',
                title: 'PUT /api/tests/{id}',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}',
                skip: () => (!ctx.values.testId ? 'Нет testId для обновления.' : ''),
                run: () => ctx.assessment.put(
                    `/api/tests/${ctx.values.testId}`,
                    {
                        title: `Промежуточный тест (обновлён) ${runLabel}`,
                        description: 'Уточнённые настройки и описание теста для стабильной автопроверки.',
                        passScore: 8,
                        attemptsLimit: 2,
                        timeLimitSeconds: 1200,
                    },
                    {auth: AUTH.TRUE},
                ),
            });

            await runStep({
                id: 'tests-settings',
                title: 'PUT /api/tests/{id}/settings',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}/settings',
                skip: () => (!ctx.values.testId ? 'Нет testId для настроек.' : ''),
                run: () => ctx.assessment.put(
                    `/api/tests/${ctx.values.testId}/settings`,
                    {
                        title: `Настройки теста: основы Web API ${runLabel}`,
                        description: 'Финальные настройки перед публикацией.',
                        timeLimitSeconds: 900,
                        passScore: 8,
                        attemptsLimit: 2,
                    },
                    {auth: AUTH.TRUE},
                ),
            });

            await runStep({
                id: 'tests-access-type',
                title: 'PUT /api/tests/{id}/access-type/{accessType}',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}/access-type/{accessType}',
                skip: () => (!ctx.values.testId ? 'Нет testId для смены доступа.' : ''),
                run: () => ctx.assessment.put(
                    `/api/tests/${ctx.values.testId}/access-type/Public`,
                    null,
                    {auth: AUTH.TRUE},
                ),
            });

            await runStep({
                id: 'tests-availability',
                title: 'PUT /api/tests/{id}/availability',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}/availability',
                skip: () => (!ctx.values.testId ? 'Нет testId для установки доступности.' : ''),
                run: () => ctx.assessment.put(
                    `/api/tests/${ctx.values.testId}/availability`,
                    null,
                    {
                        auth: AUTH.TRUE,
                        params: {
                            availableFrom: new Date().toISOString(),
                            availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        },
                    },
                ),
            });

            await runStep({
                id: 'tests-access-user',
                title: 'POST /api/tests/{id}/access/users',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests/{testId}/access/users',
                skip: () => {
                    if (!ctx.values.testId) return 'Нет testId для выдачи доступа.';
                    if (!ctx.values.userId) return 'Нет userId для выдачи доступа.';
                    return '';
                },
                run: () => ctx.assessment.post(
                    `/api/tests/${ctx.values.testId}/access/users`,
                    {
                        userId: ctx.values.userId,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {auth: AUTH.TRUE},
                ),
                onSuccess: (response) => {
                    ctx.values.accessId = response?.data?.accessId ?? ctx.values.accessId;
                },
            });

            await runStep({
                id: 'tests-access-group',
                title: 'POST /api/tests/{id}/access/groups',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests/{testId}/access/groups',
                skip: () => {
                    if (!ctx.values.testId) return 'Нет testId для выдачи доступа.';
                    if (!ctx.values.groupId) return 'Нет groupId для выдачи доступа.';
                    return '';
                },
                run: () => ctx.assessment.post(
                    `/api/tests/${ctx.values.testId}/access/groups`,
                    {
                        groupId: ctx.values.groupId,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {auth: AUTH.TRUE},
                ),
                onSuccess: (response) => {
                    ctx.values.accessId = response?.data?.accessId ?? ctx.values.accessId;
                },
            });

            await runStep({
                id: 'tests-invite',
                title: 'POST /api/tests/{id}/access/invite-links',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests/{testId}/access/invite-links',
                skip: () => (!ctx.values.testId ? 'Нет testId для ссылки-приглашения.' : ''),
                run: () => ctx.assessment.post(
                    `/api/tests/${ctx.values.testId}/access/invite-links`,
                    {
                        maxUses: 3,
                        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {auth: AUTH.TRUE},
                ),
                onSuccess: (response) => {
                    ctx.values.inviteCode = response?.data?.inviteCode ?? response?.data?.InviteCode ?? null;
                },
                getMessage: () => (ctx.values.inviteCode ? `inviteCode=${ctx.values.inviteCode}` : ''),
            });

            await runStep({
                id: 'tests-access-list',
                title: 'GET /api/tests/{id}/access',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/{testId}/access',
                skip: () => (!ctx.values.testId ? 'Нет testId для списка доступов.' : ''),
                run: () => ctx.assessment.get(`/api/tests/${ctx.values.testId}/access`, {auth: AUTH.TRUE}),
                onSuccess: (response) => {
                    if (!ctx.values.accessId && Array.isArray(response?.data) && response.data.length > 0) {
                        ctx.values.accessId = response.data[0]?.id ?? response.data[0]?.Id ?? null;
                    }
                },
            });

            await runStep({
                id: 'tests-access-revoke',
                title: 'DELETE /api/tests/access/{accessId}',
                service: 'assessment',
                method: 'DELETE',
                path: '/api/tests/access/{accessId}',
                skip: () => (!ctx.values.accessId ? 'Нет accessId для отзыва.' : ''),
                run: () => ctx.assessment.delete(`/api/tests/access/${ctx.values.accessId}`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-join',
                title: 'POST /api/tests/join/{inviteCode}',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests/join/{inviteCode}',
                skip: () => (!ctx.values.inviteCode ? 'Нет inviteCode для присоединения.' : ''),
                run: () => ctx.assessment.post(
                    `/api/tests/join/${ctx.values.inviteCode}`,
                    null,
                    {auth: AUTH.OPTIONAL},
                ),
            });

            await runStep({
                id: 'media-upload',
                title: 'POST /api/files/upload',
                service: 'media',
                method: 'POST',
                path: '/api/files/upload',
                run: async () => {
                    const formData = new FormData();
                    const file = await createSampleImageFile();
                    formData.append('files', file);
                    return ctx.media.post('/api/files/upload', formData, {auth: AUTH.TRUE});
                },
                onSuccess: (response) => {
                    const uploaded = response?.data?.uploaded ?? response?.data?.Uploaded ?? [];
                    const ids = uploaded.map((file) => file.id ?? file.Id).filter(Boolean);
                    ctx.values.mediaIds = ids;
                },
                getMessage: () => (ctx.values.mediaIds.length ? `mediaIds=${ctx.values.mediaIds.join(', ')}` : ''),
            });

            const questionTemplates = buildAutoTestQuestions(runLabel);
            for (const [index, template] of questionTemplates.entries()) {
                await runStep({
                    id: `questions-create-${index}`,
                    title: `POST /api/tests/{testId}/questions (${template.title})`,
                    service: 'assessment',
                    method: 'POST',
                    path: '/api/tests/{testId}/questions',
                    skip: () => (!ctx.values.testId ? 'Нет testId для создания вопросов.' : ''),
                    run: () => {
                        const hasMedia = ctx.values.mediaIds.length > 0;
                        const questionMediaIds = template.attachMediaToQuestion && hasMedia
                            ? ctx.values.mediaIds.slice(0, 1)
                            : null;
                        const options = (template.options || []).map((option, optionIndex) => {
                            if (template.attachMediaToOptionIndex === optionIndex && hasMedia) {
                                return {...option, mediaIds: ctx.values.mediaIds.slice(0, 1)};
                            }
                            return option;
                        });

                        const payload = {
                            text: template.title,
                            type: template.type,
                            isRequired: template.isRequired ?? true,
                            points: template.points ?? 1,
                            options,
                            mediaIds: questionMediaIds && questionMediaIds.length ? questionMediaIds : null,
                        };

                        return ctx.assessment.post(
                            `/api/tests/${ctx.values.testId}/questions`,
                            payload,
                            {auth: AUTH.TRUE},
                        );
                    },
                    onSuccess: (response) => {
                        const question = response?.data ?? {};
                        const options = question.options || [];
                        const optionMap = new Map(options.map((option) => [option.text, option.id]));
                        const correctOptionIds = (template.options || [])
                            .filter((option) => option.isCorrect)
                            .map((option) => optionMap.get(option.text))
                            .filter(Boolean);
                        const correctText = (template.options || [])
                            .find((option) => option.isCorrect)?.text || '';

                        ctx.values.questions.push({
                            id: question.id ?? question.Id ?? null,
                            type: question.type ?? template.type,
                            options,
                            correctOptionIds,
                            correctText,
                            answerText: template.answerText || correctText || '',
                        });
                    },
                    getMessage: (response) => {
                        const id = response?.data?.id ?? response?.data?.Id;
                        return id ? `questionId=${id}` : '';
                    },
                });
            }

            await runStep({
                id: 'questions-list',
                title: 'GET /api/tests/{testId}/questions',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/{testId}/questions',
                skip: () => (!ctx.values.testId ? 'Нет testId для списка вопросов.' : ''),
                run: () => ctx.assessment.get(`/api/tests/${ctx.values.testId}/questions`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'questions-get',
                title: 'GET /api/questions/{id}',
                service: 'assessment',
                method: 'GET',
                path: '/api/questions/{id}',
                skip: () => (!ctx.values.questions.length ? 'Нет вопросов для получения.' : ''),
                run: () => ctx.assessment.get(`/api/questions/${getQuestionId(ctx.values.questions[0])}`, {auth: AUTH.TRUE}),
            });

            const updatedQuestionOptions = [
                {text: '202 Accepted', isCorrect: true, order: 1},
                {text: '200 OK', isCorrect: false, order: 2},
                {text: '409 Conflict', isCorrect: false, order: 3},
            ];

            await runStep({
                id: 'questions-update',
                title: 'PUT /api/questions/{id}',
                service: 'assessment',
                method: 'PUT',
                path: '/api/questions/{id}',
                skip: () => (!ctx.values.questions.length ? 'Нет вопросов для обновления.' : ''),
                run: () => {
                    const hasMedia = ctx.values.mediaIds.length > 0;
                    const options = updatedQuestionOptions.map((option, optionIndex) => {
                        if (optionIndex === 0 && hasMedia) {
                            return {...option, mediaIds: ctx.values.mediaIds.slice(0, 1)};
                        }
                        return option;
                    });

                    return ctx.assessment.put(
                        `/api/questions/${getQuestionId(ctx.values.questions[0])}`,
                        {
                            text: `HTTP: какой статус означает принятие запроса к обработке? (${runLabel})`,
                            points: 3,
                            options,
                            mediaIds: hasMedia ? ctx.values.mediaIds.slice(0, 1) : null,
                        },
                        {auth: AUTH.TRUE},
                    );
                },
                onSuccess: (response) => {
                    const question = response?.data ?? {};
                    const options = question.options || [];
                    const optionMap = new Map(options.map((option) => [option.text, option.id]));
                    const correctOptionIds = updatedQuestionOptions
                        .filter((option) => option.isCorrect)
                        .map((option) => optionMap.get(option.text))
                        .filter(Boolean);
                    const correctText = updatedQuestionOptions.find((option) => option.isCorrect)?.text || '';

                    ctx.values.questions[0] = {
                        ...ctx.values.questions[0],
                        id: question.id ?? question.Id ?? ctx.values.questions[0]?.id,
                        type: question.type ?? ctx.values.questions[0]?.type,
                        options,
                        correctOptionIds,
                        correctText,
                    };
                },
            });

            await runStep({
                id: 'questions-reorder',
                title: 'PUT /api/tests/{testId}/questions/reorder',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{testId}/questions/reorder',
                skip: () => (!ctx.values.testId || ctx.values.questions.length < 2
                    ? 'Недостаточно вопросов для перестановки.'
                    : ''),
                run: () => {
                    const ids = ctx.values.questions.map((question) => getQuestionId(question)).filter(Boolean);
                    return ctx.assessment.put(
                        `/api/tests/${ctx.values.testId}/questions/reorder`,
                        ids.reverse(),
                        {auth: AUTH.TRUE},
                    );
                },
            });

            await runStep({
                id: 'tests-publish',
                title: 'PUT /api/tests/{id}/publish',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}/publish',
                skip: () => {
                    if (!ctx.values.testId) return 'Нет testId для публикации.';
                    if (!ctx.values.questions.length) return 'Нет вопросов для публикации теста.';
                    return '';
                },
                run: () => ctx.assessment.put(`/api/tests/${ctx.values.testId}/publish`, null, {auth: AUTH.TRUE}),
                onSuccess: () => {
                    ctx.values.isPublished = true;
                },
            });

            await runStep({
                id: 'attempts-start',
                title: 'POST /api/tests/{testId}/attempts',
                service: 'assessment',
                method: 'POST',
                path: '/api/tests/{testId}/attempts',
                skip: () => {
                    if (!ctx.values.testId) return 'Нет testId для попытки.';
                    if (!ctx.values.isPublished) return 'Тест не опубликован.';
                    return '';
                },
                run: () => ctx.assessment.post(`/api/tests/${ctx.values.testId}/attempts`, null, {auth: AUTH.TRUE}),
                onSuccess: (response) => {
                    ctx.values.attemptId = response?.data?.id ?? response?.data?.Id ?? null;
                },
                getMessage: () => (ctx.values.attemptId ? `attemptId=${ctx.values.attemptId}` : ''),
            });

            await runStep({
                id: 'attempts-get',
                title: 'GET /api/attempts/{id}',
                service: 'assessment',
                method: 'GET',
                path: '/api/attempts/{id}',
                skip: () => (!ctx.values.attemptId ? 'Нет attemptId для получения попытки.' : ''),
                run: () => ctx.assessment.get(`/api/attempts/${ctx.values.attemptId}`, {auth: AUTH.TRUE}),
            });

            for (const [index, question] of ctx.values.questions.entries()) {
                await runStep({
                    id: `attempts-answer-${index}`,
                    title: 'PUT /api/attempts/{attemptId}/answers/{questionId}',
                    service: 'assessment',
                    method: 'PUT',
                    path: '/api/attempts/{attemptId}/answers/{questionId}',
                    skip: () => (!ctx.values.attemptId ? 'Нет attemptId для ответа.' : ''),
                    run: () => ctx.assessment.put(
                        `/api/attempts/${ctx.values.attemptId}/answers/${getQuestionId(question)}`,
                        buildAnswerPayload(question),
                        {auth: AUTH.TRUE},
                    ),
                });
            }

            await runStep({
                id: 'attempts-submit',
                title: 'POST /api/attempts/{id}/submit',
                service: 'assessment',
                method: 'POST',
                path: '/api/attempts/{id}/submit',
                skip: () => (!ctx.values.attemptId ? 'Нет attemptId для отправки.' : ''),
                run: () => ctx.assessment.post(`/api/attempts/${ctx.values.attemptId}/submit`, null, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'attempts-result',
                title: 'GET /api/attempts/{id}/result',
                service: 'assessment',
                method: 'GET',
                path: '/api/attempts/{id}/result',
                skip: () => (!ctx.values.attemptId ? 'Нет attemptId для результата.' : ''),
                run: () => ctx.assessment.get(`/api/attempts/${ctx.values.attemptId}/result`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'attempts-my',
                title: 'GET /api/attempts/my',
                service: 'assessment',
                method: 'GET',
                path: '/api/attempts/my',
                run: () => ctx.assessment.get('/api/attempts/my', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'attempts-pending',
                title: 'GET /api/attempts/pending-review',
                service: 'assessment',
                method: 'GET',
                path: '/api/attempts/pending-review',
                run: () => ctx.assessment.get('/api/attempts/pending-review', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'attempts-grade',
                title: 'PUT /api/attempts/{attemptId}/answers/{questionId}/grade',
                service: 'assessment',
                method: 'PUT',
                path: '/api/attempts/{attemptId}/answers/{questionId}/grade',
                skip: () => {
                    if (!ctx.values.attemptId) return 'Нет attemptId для оценки.';
                    const longText = ctx.values.questions.find((question) => question.type === QUESTION_TYPES.LongText);
                    if (!longText) return 'Нет вопроса LongText для ручной оценки.';
                    return '';
                },
                run: () => {
                    const longText = ctx.values.questions.find((question) => question.type === QUESTION_TYPES.LongText);
                    return ctx.assessment.put(
                        `/api/attempts/${ctx.values.attemptId}/answers/${getQuestionId(longText)}/grade`,
                        {points: 3, comment: 'Ручная проверка: ответ корректный и содержит ключевые шаги.'},
                        {auth: AUTH.TRUE},
                    );
                },
            });

            await runStep({
                id: 'ai-hint',
                title: 'POST /api/ai/attempts/{attemptId}/questions/{questionId}/hint',
                service: 'ai',
                method: 'POST',
                path: '/api/ai/attempts/{attemptId}/questions/{questionId}/hint',
                skip: () => {
                    if (!ctx.values.attemptId) return 'Нет attemptId для подсказки.';
                    if (!ctx.values.questions.length) return 'Нет вопросов для подсказки.';
                    return '';
                },
                run: () => ctx.ai.post(
                    `/api/ai/attempts/${ctx.values.attemptId}/questions/${getQuestionId(ctx.values.questions[0])}/hint`,
                    null,
                    {auth: AUTH.TRUE},
                ),
            });

            await runStep({
                id: 'tests-attempts',
                title: 'GET /api/tests/{testId}/attempts',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/{testId}/attempts',
                skip: () => (!ctx.values.testId ? 'Нет testId для списка попыток.' : ''),
                run: () => ctx.assessment.get(`/api/tests/${ctx.values.testId}/attempts`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-results',
                title: 'GET /api/tests/{testId}/results',
                service: 'assessment',
                method: 'GET',
                path: '/api/tests/{testId}/results',
                skip: () => (!ctx.values.testId ? 'Нет testId для результатов.' : ''),
                run: () => ctx.assessment.get(`/api/tests/${ctx.values.testId}/results`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'tests-unpublish',
                title: 'PUT /api/tests/{id}/unpublish',
                service: 'assessment',
                method: 'PUT',
                path: '/api/tests/{id}/unpublish',
                skip: () => {
                    if (!ctx.values.testId) return 'Нет testId для снятия публикации.';
                    if (!ctx.values.isPublished) return 'Тест не опубликован.';
                    return '';
                },
                run: () => ctx.assessment.put(`/api/tests/${ctx.values.testId}/unpublish`, null, {auth: AUTH.TRUE}),
                onSuccess: () => {
                    ctx.values.isPublished = false;
                },
            });

            await runStep({
                id: 'media-get',
                title: 'POST /api/files/get',
                service: 'media',
                method: 'POST',
                path: '/api/files/get',
                skip: () => (!ctx.values.mediaIds.length ? 'Нет mediaIds для получения.' : ''),
                run: () => ctx.media.post('/api/files/get', {ids: ctx.values.mediaIds}, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'media-download',
                title: 'POST /api/files/download',
                service: 'media',
                method: 'POST',
                path: '/api/files/download',
                skip: () => (!ctx.values.mediaIds.length ? 'Нет mediaIds для скачивания.' : ''),
                run: () => ctx.media.post(
                    '/api/files/download',
                    {ids: ctx.values.mediaIds},
                    {auth: AUTH.OPTIONAL, responseType: 'blob'},
                ),
            });

            await runStep({
                id: 'media-my',
                title: 'GET /api/files/my',
                service: 'media',
                method: 'GET',
                path: '/api/files/my',
                run: () => ctx.media.get('/api/files/my', {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'media-delete',
                title: 'POST /api/files/delete',
                service: 'media',
                method: 'POST',
                path: '/api/files/delete',
                skip: () => (!ctx.values.mediaIds.length ? 'Нет mediaIds для удаления.' : ''),
                run: () => ctx.media.post('/api/files/delete', {ids: ctx.values.mediaIds}, {auth: AUTH.TRUE}),
            });

            for (const [index, question] of ctx.values.questions.entries()) {
                await runStep({
                    id: `questions-delete-${index}`,
                    title: 'DELETE /api/questions/{id}',
                    service: 'assessment',
                    method: 'DELETE',
                    path: '/api/questions/{id}',
                    run: () => ctx.assessment.delete(`/api/questions/${getQuestionId(question)}`, {auth: AUTH.TRUE}),
                });
            }

            await runStep({
                id: 'tests-delete',
                title: 'DELETE /api/tests/{id}',
                service: 'assessment',
                method: 'DELETE',
                path: '/api/tests/{id}',
                skip: () => (!ctx.values.testId ? 'Нет testId для удаления.' : ''),
                run: () => ctx.assessment.delete(`/api/tests/${ctx.values.testId}`, {auth: AUTH.TRUE}),
            });

            await runStep({
                id: 'groups-delete',
                title: 'DELETE /api/groups/{id}',
                service: 'identify',
                method: 'DELETE',
                path: '/api/groups/{id}',
                skip: () => (!ctx.values.groupId ? 'Нет groupId для удаления.' : ''),
                run: () => ctx.identify.delete(`/api/groups/${ctx.values.groupId}`, {auth: AUTH.TRUE}),
            });
        } finally {
            setAutoTestRunning(false);
        }
    };

    // Отправка запроса через выбранный клиент.
    const handleSend = async () => {
        const trimmedBody = request.body.trim();
        let payload;
        const useFormData = endpointMeta.upload;
        const shouldDownload = endpointMeta.download;
        const hasFiles = uploadFiles.length > 0;

        if (useFormData && endpointMeta.uploadRequired && !hasFiles) {
            notifyCustom({
                type: 'warning',
                message: 'Выберите файл для загрузки.',
                duration: 2400,
            });
            return;
        }

        if (trimmedBody) {
            try {
                payload = JSON.parse(trimmedBody);
            } catch (error) {
                notifyCustom({
                    type: 'error',
                    message: 'Неверный JSON в теле запроса.',
                    duration: 2600,
                });
                return;
            }
        }

        setPending(true);
        try {
            const client = apiClients[request.service] ?? apiClients.assessment;
            const requestConfig = {
                method: request.method,
                url: request.path,
                auth: request.auth,
            };

            if (useFormData) {
                const formData = new FormData();
                const fieldName = endpointMeta.uploadField || DEFAULT_UPLOAD_FIELD;

                if (hasFiles) {
                    uploadFiles.forEach((file) => {
                        formData.append(fieldName, file);
                    });
                }

                if (payload !== undefined) {
                    if (payload && typeof payload === 'object') {
                        Object.entries(payload).forEach(([key, value]) => appendFormValue(formData, key, value));
                    } else {
                        appendFormValue(formData, 'payload', payload);
                    }
                }

                // Для FormData не задаём Content-Type вручную, чтобы браузер выставил boundary.
                requestConfig.data = formData;
            } else {
                requestConfig.data = payload;
                if (payload !== undefined) {
                    // Явно указываем JSON для примитивных тел запроса.
                    requestConfig.headers = {
                        ...(requestConfig.headers || {}),
                        'Content-Type': 'application/json',
                    };
                }
            }

            if (shouldDownload) {
                requestConfig.responseType = 'blob';
            }

            const result = await client.request(requestConfig);

            if (shouldDownload) {
                const fileName = buildDownloadFileName(result.headers, request.path);
                const blob = toBlob(result.data, result.headers);

                triggerDownload(blob, fileName);
                setResponse({
                    ok: true,
                    status: result.status,
                    data: {
                        message: 'Файл скачан.',
                        fileName,
                    },
                });
                return;
            }

            setResponse({
                ok: true,
                status: result.status,
                data: result.data,
            });
        } catch (error) {
            const status = error?.response?.status ?? null;
            const data = error?.response?.data ?? error?.message ?? error;
            setResponse({
                ok: false,
                status,
                data,
            });
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="swagger-shell">
            <header className="swagger-hero">
                <div className="swagger-title">
                    <div className="swagger-eyebrow">Swagger-панель</div>
                    <h1>API-консоль</h1>
                    <p className="swagger-subtitle">
                        Базовая страница для тестирования API.
                    </p>
                </div>
                <div className="swagger-card">
                    <h3>Авторизация</h3>
                    <p className="swagger-subtitle">{tokenLabel}</p>
                    {tokenPreview && (
                        <p className="swagger-subtitle">Access token: {tokenPreview}</p>
                    )}
                    {tokenExpiresAt && (
                        <p className="swagger-subtitle">
                            Истекает: {tokenExpiresAt}
                        </p>
                    )}
                    <div className="swagger-auth-actions">
                        <button className="swagger-button" type="button" onClick={handleLogin}>
                            Войти через Keycloak
                        </button>
                        <button
                            className="swagger-button secondary"
                            type="button"
                            onClick={handleLogout}
                            disabled={!hasToken}
                        >
                            Выйти
                        </button>
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={handleCopyToken}
                        >
                            Скопировать токен
                        </button>
                    </div>
                </div>
            </header>

            <div className="swagger-tabs">
                <button
                    className={`swagger-tab ${activeTab === 'console' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('console')}
                >
                    Консоль
                </button>
                <button
                    className={`swagger-tab ${activeTab === 'tests' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('tests')}
                >
                    Автотесты
                </button>
            </div>

            {activeTab === 'console' && (
                <>
                    <section className="swagger-grid">
                <div className="swagger-panel">
                    <h2>Базовые URL</h2>
                    <ul className="swagger-url-list">
                        {serviceEntries.map(({key, url}) => (
                            <li key={key} className="swagger-url-item">
                                <span>{key}</span>
                                <code>{url}</code>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="swagger-panel">
                    <h2>Конструктор запросов</h2>
                    <div className="swagger-field">
                        <label htmlFor="swagger-service">Сервис</label>
                        <select
                            id="swagger-service"
                            className="swagger-select"
                            value={request.service}
                            onChange={handleServiceChange}
                        >
                            {serviceEntries.map(({key}) => (
                                <option key={key} value={key}>{key}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-method">Метод</label>
                        <select
                            id="swagger-method"
                            className="swagger-select"
                            value={request.method}
                            onChange={handleMethodChange}
                        >
                            {METHODS.map((method) => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-path">Путь</label>
                        <select
                            id="swagger-path"
                            className="swagger-select"
                            value={request.path}
                            onChange={handlePathChange}
                            disabled={!pathOptions.length}
                        >
                            <option value="">Выберите путь</option>
                            {pathOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        {pathOptions.length ? (
                            <p className="swagger-hint">Выберите путь, чтобы подтянуть параметры запроса.</p>
                        ) : (
                            <p className="swagger-hint">Нет путей для выбранных сервиса и метода.</p>
                        )}
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-auth">Авторизация</label>
                        <select
                            id="swagger-auth"
                            className="swagger-select"
                            value={request.auth}
                            onChange={(event) => setRequest((prev) => ({...prev, auth: event.target.value}))}
                        >
                            {AUTH_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="swagger-field">
                        <label htmlFor="swagger-body">Тело (JSON)</label>
                        <textarea
                            id="swagger-body"
                            className="swagger-textarea"
                            value={request.body}
                            onChange={(event) => setRequest((prev) => ({...prev, body: event.target.value}))}
                            placeholder="{}"
                        />
                    </div>
                    {endpointMeta.upload && (
                        <div className="swagger-field">
                            <label htmlFor="swagger-files">Файлы</label>
                            <input
                                id="swagger-files"
                                className="swagger-input"
                                type="file"
                                multiple={endpointMeta.uploadMultiple}
                                onChange={handleFilesChange}
                            />
                            {selectedFilesLabel && (
                                <p className="swagger-hint">Выбрано: {selectedFilesLabel}</p>
                            )}
                            <p className="swagger-hint">
                                Поле формы: {endpointMeta.uploadField || DEFAULT_UPLOAD_FIELD}
                            </p>
                            {endpointMeta.uploadRequired && (
                                <p className="swagger-hint">
                                    Файл обязателен для запроса.
                                </p>
                            )}
                            <div className="swagger-file-actions">
                                <button
                                    className="swagger-button ghost"
                                    type="button"
                                    onClick={handleClearFiles}
                                    disabled={!uploadFiles.length}
                                >
                                    Очистить файлы
                                </button>
                            </div>
                        </div>
                    )}
                    {endpointMeta.download && (
                        <p className="swagger-hint">Ответ будет скачан как файл.</p>
                    )}
                    <button
                        className="swagger-button"
                        type="button"
                        onClick={handleSend}
                        disabled={pending}
                    >
                        {pending ? '...' : 'Отправить запрос'}
                    </button>
                </div>
            </section>

            <section className="swagger-grid">
                <div className="swagger-panel">
                    <h2>Ответ</h2>
                    <div className="swagger-response">
                        {response ? (
                            `HTTP ${response.status ?? '-'}\n${formatResponse(response)}`
                        ) : (
                            'Нет данных'
                        )}
                    </div>
                </div>
            </section>

            <section className="swagger-endpoints">
                <div className="swagger-endpoints-header">
                    <h2>Эндпоинты</h2>
                    <button
                        className="swagger-button secondary"
                        type="button"
                        onClick={loadSwagger}
                        disabled={swaggerLoading}
                    >
                        {swaggerLoading ? '...' : 'Обновить из Swagger'}
                    </button>
                </div>
                {swaggerErrors.length > 0 && (
                    <p className="swagger-subtitle swagger-error">
                        Не удалось загрузить Swagger для: {swaggerErrors.join(', ')}. Показан резервный список.
                    </p>
                )}
                {swaggerLoading && (
                    <p className="swagger-subtitle swagger-loading">
                        Загружаем Swagger-описания...
                    </p>
                )}
                <p className="swagger-hint">Нажмите на эндпоинт, чтобы перенести его в форму запроса.</p>
                {!serviceGroups.length && !swaggerLoading && (
                    <p className="swagger-subtitle">Эндпоинты не найдены.</p>
                )}
                {serviceGroups.map((service) => (
                    <div key={service.serviceKey} className="swagger-service">
                        <div className="swagger-service-title">{service.serviceTitle}</div>
                        {service.groups.map((group) => (
                            <details key={`${service.serviceKey}-${group.title}`} className="swagger-group" open>
                                <summary>{group.title}</summary>
                                {group.items.map((item) => (
                                    <button
                                        key={`${group.title}-${item.method}-${item.path}`}
                                        className="swagger-endpoint swagger-endpoint-button"
                                        type="button"
                                        onClick={() => handleEndpointClick(item, service.serviceKey)}
                                    >
                                        <span className={`method-badge ${item.method.toLowerCase()}`}>
                                            {item.method}
                                        </span>
                                        <div className="endpoint-meta">
                                            <div className="endpoint-path">{item.path}</div>
                                            {item.description && (
                                                <div className="endpoint-desc">{item.description}</div>
                                            )}
                                            {(item.hasExample || item.example != null) && (
                                                <div className="endpoint-desc">Есть пример тела запроса.</div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </details>
                        ))}
                    </div>
                ))}
            </section>
                </>
            )}

            {activeTab === 'tests' && (
                <section className="swagger-tests">
                    <div className="swagger-panel">
                        <div className="swagger-tests-header">
                            <h2>Автотестирование</h2>
                            <button
                                className="swagger-button"
                                type="button"
                                onClick={runAutoTests}
                                disabled={autoTestRunning}
                            >
                                {autoTestRunning ? '...' : 'Запустить тесты'}
                            </button>
                        </div>
                        <p className="swagger-hint">
                            Скрипт последовательно проверяет основные эндпоинты и формирует тестовые данные.
                        </p>
                        <div className="swagger-tests-summary">
                            <span>Всего: {autoTestSummary.total}</span>
                            <span>Успешно: {autoTestSummary.success}</span>
                            <span>Ошибки: {autoTestSummary.failed}</span>
                            <span>Пропущено: {autoTestSummary.skipped}</span>
                        </div>
                    </div>
                    <div className="swagger-panel">
                        <div className="swagger-tests-header">
                            <h2>Результаты</h2>
                            {autoTestRunning && (
                                <span className="swagger-loading">Выполняется...</span>
                            )}
                        </div>
                        {autoTestResults.length ? (
                            <div className="swagger-tests-list">
                                {autoTestResults.map((item, index) => (
                                    <div
                                        key={`${item.id}-${index}`}
                                        className={`swagger-test-row ${item.status}`}
                                    >
                                        <div className="swagger-test-main">
                                            <span className={`method-badge ${item.method.toLowerCase()}`}>
                                                {item.method}
                                            </span>
                                            <div className="swagger-test-meta">
                                                <div className="swagger-test-path">{item.path}</div>
                                                {item.title && (
                                                    <div className="swagger-test-title">{item.title}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="swagger-test-metrics">
                                            <span className="swagger-test-status">
                                                {getAutoTestStatusLabel(item.status)}
                                            </span>
                                            {item.httpStatus != null && (
                                                <span className="swagger-test-code">HTTP {item.httpStatus}</span>
                                            )}
                                            <span className="swagger-test-time">{item.durationMs} мс</span>
                                        </div>
                                        {item.message && (
                                            <div className="swagger-test-message">{item.message}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="swagger-subtitle">Нет результатов. Запустите тесты.</p>
                        )}
                    </div>
                </section>
            )}
        </main>
    );
}
