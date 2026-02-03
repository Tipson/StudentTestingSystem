/* eslint-disable no-restricted-globals */
/* eslint-env worker */
/**
 * Web Worker для выполнения HTTP запросов при нагрузочном тестировании
 * Работает в отдельном потоке для предотвращения блокировки UI
 */

const ABSOLUTE_URL = /^https?:\/\//i;

// Замена переменных в строках
function replaceVariables(str, context) {
    if (!str) return str;
    let result = str;

    result = result.replace(/\{\{timestamp\}\}/g, String(context.timestamp || Date.now()));
    result = result.replace(/\{\{index\}\}/g, String(context.index || 0));
    result = result.replace(/\{\{randomId\}\}/g, context.randomId || crypto.randomUUID());

    Object.keys(context).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(context[key]));
    });

    return result;
}

// Разрешение URL
function resolveUrl(endpoint, baseUrl) {
    if (!endpoint) return endpoint;
    if (ABSOLUTE_URL.test(endpoint)) return endpoint;
    if (!baseUrl) return endpoint;

    try {
        return new URL(endpoint, baseUrl).toString();
    } catch (error) {
        const trimmedBase = String(baseUrl).replace(/\/$/, '');
        const path = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`;
        return `${trimmedBase}${path}`;
    }
}

// Извлечение значения по пути
function getValueByPath(data, path) {
    if (!data || !path) return undefined;
    const normalized = String(path).replace(/\[(\d+)\]/g, '.$1');
    const parts = normalized.split('.').filter(Boolean);
    let current = data;

    for (const part of parts) {
        if (current == null) return undefined;
        const key = /^\d+$/.test(part) ? Number(part) : part;
        current = current[key];
    }

    return current;
}

// Извлечение ID-подобных значений
function extractIdLike(data) {
    if (!data) return null;
    if (Array.isArray(data)) {
        for (const item of data) {
            const value = extractIdLike(item);
            if (value) return value;
        }
        return null;
    }
    return data.id ?? data.Id ?? data.ID ?? null;
}

// Извлечение attemptId
function extractAttemptId(data) {
    if (!data) return null;
    return data.attemptId ?? data.id ?? data.Id ?? data.ID ?? null;
}

// Разрешение значения для capture
function resolveCaptureValue(extractor, responseData, context) {
    if (!extractor) return null;
    if (typeof extractor === 'function') return extractor(responseData, context);
    if (Array.isArray(extractor)) {
        for (const item of extractor) {
            const value = resolveCaptureValue(item, responseData, context);
            if (value !== null && value !== undefined) return value;
        }
        return null;
    }
    if (typeof extractor === 'string') return getValueByPath(responseData, extractor);
    return null;
}

// Применение capture
function applyCapture(capture, responseData, context) {
    if (!capture || !responseData) return;

    Object.entries(capture).forEach(([key, extractor]) => {
        const value = resolveCaptureValue(extractor, responseData, context);
        if (value !== null && value !== undefined && value !== '') {
            context[key] = value;
        }
    });
}

// Выполнение одного HTTP запроса
async function executeRequest(method, url, body, headers, accessToken, parseResponse = false) {
    const startTime = performance.now();

    try {
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (accessToken) {
            requestHeaders.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body && (method !== 'GET' && method !== 'DELETE') ? body : undefined,
        });

        let responseData = null;
        if (parseResponse) {
            try {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }
            } catch (error) {
                responseData = null;
            }
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        return {
            success: response.ok,
            responseTime,
            statusCode: response.status,
            timestamp: Date.now(),
            responseData,
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        return {
            success: false,
            responseTime,
            error: error.message || 'Unknown error',
            timestamp: Date.now(),
        };
    }
}

// Выполнение сценария
async function executeScenario(scenario, context, baseUrl, accessToken) {
    const results = [];
    const scenarioContext = { ...context };

    for (const step of scenario.steps) {
        if (step.delay && step.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, step.delay));
        }

        const url = resolveUrl(replaceVariables(step.endpoint, scenarioContext), baseUrl);
        const body = step.body ? replaceVariables(step.body, scenarioContext) : undefined;

        const result = await executeRequest(
            step.method,
            url,
            body,
            step.headers || {},
            accessToken,
            Boolean(step.capture)
        );

        results.push(result);

        if (step.capture && result.responseData) {
            applyCapture(step.capture, result.responseData, scenarioContext);
        }

        // Прерываем сценарий при ошибке
        if (!result.success) {
            break;
        }
    }

    return results;
}

// Обработчик сообщений от главного потока
self.onmessage = async function(e) {
    const { type, taskId, payload } = e.data;

    try {
        if (type === 'EXECUTE_ENDPOINT') {
            const { method, endpoint, body, headers, context, baseUrl, accessToken } = payload;

            const url = resolveUrl(replaceVariables(endpoint, context), baseUrl);
            const processedBody = body ? replaceVariables(body, context) : undefined;

            const result = await executeRequest(method, url, processedBody, headers, accessToken, false);

            self.postMessage({
                type: 'TASK_COMPLETE',
                taskId,
                results: [result],
            });
        } else if (type === 'EXECUTE_SCENARIO') {
            const { scenario, context, baseUrl, accessToken } = payload;

            const results = await executeScenario(scenario, context, baseUrl, accessToken);

            self.postMessage({
                type: 'TASK_COMPLETE',
                taskId,
                results,
            });
        } else if (type === 'PING') {
            self.postMessage({
                type: 'PONG',
                taskId,
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'TASK_ERROR',
            taskId,
            error: error.message || 'Unknown error',
        });
    }
};
