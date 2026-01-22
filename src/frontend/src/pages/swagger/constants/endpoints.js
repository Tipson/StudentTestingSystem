/**
 * Резервные конфигурации эндпоинтов на случай,
 * если Swagger недоступен
 */
import { AUTH } from '@api/auth.js';
import { assessmentApiDocs, identifyApiDocs, mediaApiDocs } from '@api';
import { DEFAULT_UPLOAD_FIELD } from './api.js';

const normalizePathParams = (path) => (path ? path.replace(/\{[^}]+\}/g, '{}') : '');

const makeDocsKey = (service, method, path) =>
    `${service || 'unknown'}::${method}::${normalizePathParams(path)}`;

const API_DOCS = [
    ...assessmentApiDocs,
    ...mediaApiDocs,
    ...identifyApiDocs,
];

export const API_DOCS_MAP = new Map();
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

export const FALLBACK_ENDPOINT_GROUPS = applyDocsToFallback([
    {
        title: 'Health',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            { method: 'GET', path: '/healthz', auth: AUTH.FALSE },
        ],
    },
    {
        title: 'AI',
        service: 'ai',
        serviceTitle: 'AI',
        items: [
            { method: 'POST', path: '/api/ai/attempts/{attemptId}/questions/{questionId}/hint' },
        ],
    },
    {
        title: 'Tests',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            { method: 'POST', path: '/api/tests' },
            { method: 'GET', path: '/api/tests' },
            { method: 'GET', path: '/api/tests/{id}' },
            { method: 'PUT', path: '/api/tests/{id}' },
            { method: 'DELETE', path: '/api/tests/{id}' },
            { method: 'GET', path: '/api/tests/my' },
            { method: 'PUT', path: '/api/tests/{id}/settings' },
            { method: 'PUT', path: '/api/tests/{id}/access-type/{accessType}' },
            { method: 'PUT', path: '/api/tests/{id}/availability' },
            { method: 'PUT', path: '/api/tests/{id}/publish' },
            { method: 'PUT', path: '/api/tests/{id}/unpublish' },
            { method: 'POST', path: '/api/tests/{testId}/access/users' },
            { method: 'POST', path: '/api/tests/{testId}/access/groups' },
            { method: 'POST', path: '/api/tests/{testId}/access/invite-links' },
            { method: 'GET', path: '/api/tests/{testId}/access' },
            { method: 'DELETE', path: '/api/tests/access/{accessId}' },
            { method: 'POST', path: '/api/tests/join/{inviteCode}' },
        ],
    },
    {
        title: 'Attempts',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            { method: 'POST', path: '/api/tests/{testId}/attempts' },
            { method: 'GET', path: '/api/tests/{testId}/attempts' },
            { method: 'GET', path: '/api/tests/{testId}/results' },
            { method: 'GET', path: '/api/attempts/{id}' },
            {
                method: 'PUT',
                path: '/api/attempts/{attemptId}/answers/{questionId}',
                example: {
                    optionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    optionIds: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
                    text: 'Пример ответа студента',
                },
            },
            { method: 'POST', path: '/api/attempts/{id}/submit' },
            { method: 'GET', path: '/api/attempts/{id}/result' },
            { method: 'GET', path: '/api/attempts/my' },
            { method: 'GET', path: '/api/attempts/pending-review' },
            { method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}/grade' },
        ],
    },
    {
        title: 'Questions',
        service: 'assessment',
        serviceTitle: 'Assessment',
        items: [
            { method: 'POST', path: '/api/tests/{testId}/questions' },
            { method: 'GET', path: '/api/tests/{testId}/questions' },
            { method: 'GET', path: '/api/questions/{id}' },
            { method: 'PUT', path: '/api/questions/{id}' },
            { method: 'DELETE', path: '/api/questions/{id}' },
            { method: 'PUT', path: '/api/tests/{testId}/questions/reorder' },
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
            { method: 'POST', path: '/api/files/get' },
            { method: 'POST', path: '/api/files/download', download: true },
            { method: 'GET', path: '/api/files/my' },
            { method: 'POST', path: '/api/files/delete' },
        ],
    },
    {
        title: 'Groups',
        service: 'identify',
        serviceTitle: 'Identity',
        items: [
            { method: 'POST', path: '/api/groups' },
            { method: 'GET', path: '/api/groups' },
            { method: 'PUT', path: '/api/groups/{id}' },
            { method: 'DELETE', path: '/api/groups/{id}' },
            { method: 'PUT', path: '/api/groups/{id}/active' },
            { method: 'GET', path: '/api/groups/{id}/students' },
            { method: 'POST', path: '/api/groups/{id}/students' },
        ],
    },
    {
        title: 'Me',
        service: 'identify',
        serviceTitle: 'Identity',
        items: [
            { method: 'GET', path: '/api/me' },
            { method: 'PUT', path: '/api/me/group' },
            { method: 'DELETE', path: '/api/me/group' },
        ],
    },
]);
