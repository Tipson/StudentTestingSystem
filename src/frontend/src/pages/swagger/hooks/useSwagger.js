import {useState, useCallback, useMemo} from 'react';
import axios from 'axios';
import {API_BASE_URLS} from '@api/config.js';
import {AUTH, getAccessToken} from '@api/auth.js';
import {
    HTTP_METHODS,
    DEFAULT_UPLOAD_FIELD,
    FALLBACK_ENDPOINT_GROUPS,
    API_DOCS_MAP,
    makeDocsKey,
    DEFAULT_REQUEST,
} from '../constants/index.js';
import {
    normalizeBaseUrl,
    getSwaggerUrl,
    extractRequestExample,
    resolveAuthRequired,
    extractUploadMeta,
    extractDownloadMeta,
} from '../utils/index.js';

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

export function useSwagger() {
    const [swaggerGroups, setSwaggerGroups] = useState([]);
    const [swaggerLoading, setSwaggerLoading] = useState(false);
    const [swaggerErrors, setSwaggerErrors] = useState([]);

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
                const data = result.value?.data;
                if (data) {
                    const groups = buildSwaggerGroups(data, source.key, API_DOCS_MAP);
                    nextGroups.push(...groups);
                }
            } else {
                nextErrors.push({
                    service: source.key,
                    message: result.reason?.message || 'Ошибка загрузки',
                });
            }
        });

        setSwaggerGroups(nextGroups);
        setSwaggerErrors(nextErrors);
        setSwaggerLoading(false);
    }, [swaggerSources]);

    return {
        swaggerGroups,
        swaggerLoading,
        swaggerErrors,
        serviceEntries,
        swaggerSources,
        endpointGroups,
        serviceGroups,
        loadSwagger,
    };
}
