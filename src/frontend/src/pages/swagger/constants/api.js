/**
 * Константы, связанные с API, для страницы Swagger
 */
import { AUTH } from '@api/auth.js';

export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
export const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);
export const SWAGGER_PATH = '/swagger/v1/swagger.json';
export const JSON_CONTENT_TYPES = ['application/json', 'text/json', 'application/*+json'];
export const DOWNLOAD_CONTENT_TYPES = ['application/octet-stream', 'application/zip', 'application/pdf'];
export const DEFAULT_UPLOAD_FIELD = 'files';

export const DEFAULT_ENDPOINT_META = {
    upload: false,
    uploadField: DEFAULT_UPLOAD_FIELD,
    uploadMultiple: false,
    uploadRequired: false,
    download: false,
};

export const AUTH_OPTIONS = [
    { value: AUTH.TRUE, label: 'Требуется' },
    { value: AUTH.OPTIONAL, label: 'Опционально' },
    { value: AUTH.FALSE, label: 'Без авторизации' },
];

export const USER_SOURCE_LABELS = {
    'backend+keycloak': 'Backend + Keycloak',
    keycloak: 'Keycloak',
    backend: 'Backend',
    none: 'Нет данных',
};

export const DEFAULT_REQUEST = {
    service: 'assessment',
    method: 'GET',
    path: '/healthz',
    auth: AUTH.FALSE,
    body: '',
};
