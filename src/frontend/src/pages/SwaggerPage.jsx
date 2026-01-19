import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import {API_BASE_URLS} from '@api/config.js';
import {apiClients} from '@api/client.js';
import {AUTH, getAccessToken} from '@api/auth.js';
import {assessmentApiDocs, identifyApiDocs, mediaApiDocs} from '@api/index.js';
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
            {method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}'},
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
            {method: 'GET', path: '/api/me/me'},
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
        </main>
    );
}
