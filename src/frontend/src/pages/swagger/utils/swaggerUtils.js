import {
    SWAGGER_PATH,
    JSON_CONTENT_TYPES,
    DOWNLOAD_CONTENT_TYPES,
    DEFAULT_UPLOAD_FIELD,
} from '../constants/apiConstants.js';

export const normalizeBaseUrl = (value) => {
    if (!value) return '';
    return value.replace(/\/$/, '');
};

export const getSwaggerUrl = (baseUrl) => {
    const normalized = normalizeBaseUrl(baseUrl);
    return normalized ? `${normalized}${SWAGGER_PATH}` : '';
};

export const pickJsonContent = (content) => {
    if (!content) return null;

    for (const contentType of JSON_CONTENT_TYPES) {
        if (content[contentType]) {
            return {contentType, entry: content[contentType]};
        }
    }

    return null;
};

export const resolveSchemaRef = (schema, components) => {
    if (!schema || !schema.$ref) return schema;
    const refKey = schema.$ref.split('/').pop();
    return components?.schemas?.[refKey] ?? schema;
};

// Собирает шаблон тела запроса из JSON-схемы Swagger.
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

export const resolveAuthRequired = (operation, docSecurity) => {
    if (Array.isArray(operation?.security)) {
        return operation.security.length > 0;
    }
    if (Array.isArray(docSecurity)) {
        return docSecurity.length > 0;
    }
    return false;
};

export const isBinarySchema = (schema) => schema?.type === 'string' && schema.format === 'binary';

export const isBinaryArraySchema = (schema) => schema?.type === 'array' && isBinarySchema(schema.items);

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

export const isDownloadContentType = (contentType) => {
    if (!contentType) return false;
    const normalized = contentType.toLowerCase();

    if (DOWNLOAD_CONTENT_TYPES.includes(normalized)) return true;
    if (normalized.startsWith('image/')) return true;
    if (normalized.startsWith('video/')) return true;
    if (normalized.startsWith('audio/')) return true;

    return false;
};

export const extractDownloadMeta = (responses, path) => {
    if (path && /\/download/i.test(path)) {
        return true;
    }

    if (!responses) return false;

    return Object.values(responses).some((response) =>
        Object.keys(response?.content || {}).some((contentType) => isDownloadContentType(contentType)),
    );
};

export const parseContentDispositionFileName = (value) => {
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

export const buildDownloadFileName = (headers, path) => {
    const rawHeader = headers?.['content-disposition'] || headers?.['Content-Disposition'];
    const fileName = parseContentDispositionFileName(rawHeader);
    if (fileName) return fileName;

    const pathTail = path?.split('/').filter(Boolean).pop();
    return pathTail || `download-${Date.now()}`;
};

export const toBlob = (data, headers) => {
    if (data instanceof Blob) return data;

    const contentType = headers?.['content-type'] || 'application/octet-stream';
    return new Blob([data], {type: contentType});
};

export const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName || `download-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

export const appendFormValue = (formData, key, value) => {
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
