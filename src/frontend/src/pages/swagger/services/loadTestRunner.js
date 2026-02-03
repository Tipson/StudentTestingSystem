/**
 * Service for running load tests against API endpoints
 */
import { getAccessToken } from '@api/auth.js';
import { getApiBaseUrl } from '@api/config.js';
import { QUESTION_TYPES } from '../constants/autotest.js';

// Replace {{var}} placeholders in strings
function replaceVariables(str, context) {
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


const ABSOLUTE_URL = /^https?:\/\//i;

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

// Extract value by path (path.to.value or arr[0].id)
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

function extractAttemptId(data) {
    if (!data) return null;
    return data.attemptId ?? data.id ?? data.Id ?? data.ID ?? null;
}

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

function applyCapture(capture, responseData, context) {
    if (!capture || !responseData) return;

    Object.entries(capture).forEach(([key, extractor]) => {
        const value = resolveCaptureValue(extractor, responseData, context);
        if (value !== null && value !== undefined && value !== '') {
            context[key] = value;
        }
    });
}

// Execute a single HTTP request
async function executeRequest(method, url, body, headers, options = {}) {
    const startTime = performance.now();
    const {signal, parseResponse} = options;

    try {
        const token = await getAccessToken(false);

        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (token) {
            requestHeaders.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body && (method !== 'GET' && method !== 'DELETE') ? body : undefined,
            signal,
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
            timestamp: new Date(),
            responseData,
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        return {
            success: false,
            responseTime,
            error: error?.name === 'AbortError' ? 'Request aborted' : (error.message || 'Unknown error'),
            timestamp: new Date(),
        };
    }
}

// Execute a scenario (sequence of steps)
async function executeScenario(scenario, context, baseUrl, signal) {
    const results = [];
    const scenarioContext = { ...context };

    for (const step of scenario.steps) {
        if (signal?.aborted) break;

        if (step.delay && step.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, step.delay));
            if (signal?.aborted) break;
        }

        const url = resolveUrl(replaceVariables(step.endpoint, scenarioContext), baseUrl);
        const body = step.body ? replaceVariables(step.body, scenarioContext) : undefined;

        const result = await executeRequest(step.method, url, body, step.headers, {
            signal,
            parseResponse: Boolean(step.capture),
        });
        results.push(result);

        if (step.capture && result.responseData) {
            applyCapture(step.capture, result.responseData, scenarioContext);
        }

        if (!result.success) {
            break;
        }
    }

    return results;
}

// Rate limiter for RPS mode
function createRateLimiter(rps) {
    const interval = 1000 / rps;
    let lastExecutionTime = 0;

    return async () => {
        const now = performance.now();
        const timeSinceLastExecution = now - lastExecutionTime;

        if (timeSinceLastExecution < interval) {
            await new Promise((resolve) =>
                setTimeout(resolve, interval - timeSinceLastExecution)
            );
        }

        lastExecutionTime = performance.now();
    };
}

// Metrics tracker
class MetricsTracker {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.lastUpdateTime = 0;
        this.updateInterval = 100;
    }

    addResult(result) {
        this.results.push(result);
    }

    shouldUpdate() {
        const now = Date.now();
        if (now - this.lastUpdateTime >= this.updateInterval) {
            this.lastUpdateTime = now;
            return true;
        }
        return false;
    }

    getMetrics() {
        const now = Date.now();
        const elapsedTime = now - this.startTime;
        const elapsedSeconds = elapsedTime / 1000;

        const successfulRequests = this.results.filter((r) => r.success).length;
        const failedRequests = this.results.length - successfulRequests;

        const responseTimes = this.results.map((r) => r.responseTime);
        const averageResponseTime =
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;

        const currentRPS = elapsedSeconds > 0 ? this.results.length / elapsedSeconds : 0;

        return {
            totalRequests: this.results.length,
            successfulRequests,
            failedRequests,
            averageResponseTime,
            currentRPS,
            elapsedTime,
        };
    }

    getResults() {
        return this.results;
    }
}

// Scenario presets for load testing
const SCENARIOS = {
    'full-test-lifecycle': {
        id: 'full-test-lifecycle',
        name: 'Создание теста и вопросов',
        steps: [
            {
                name: 'Создание теста',
                method: 'POST',
                endpoint: '/api/tests',
                body: JSON.stringify({
                    title: 'Load Test {{timestamp}}',
                    description: 'Нагрузочный тест',
                    durationMinutes: 30,
                    maxAttempts: 3,
                }),
                capture: { testId: extractIdLike },
            },
            {
                name: 'Добавление вопроса',
                method: 'POST',
                endpoint: '/api/tests/{{testId}}/questions',
                body: JSON.stringify({
                    text: 'Короткий вопрос {{index}}',
                    type: QUESTION_TYPES.ShortAnswer,
                    points: 1,
                    isRequired: true,
                    answerText: '42',
                    correctAnswer: '42',
                }),
                capture: { questionId: extractIdLike },
            },
            {
                name: 'Добавление второго вопроса',
                method: 'POST',
                endpoint: '/api/tests/{{testId}}/questions',
                body: JSON.stringify({
                    text: 'Короткий вопрос 2 {{index}}',
                    type: QUESTION_TYPES.ShortAnswer,
                    points: 1,
                    isRequired: true,
                    answerText: '42',
                    correctAnswer: '42',
                }),
            },
            {
                name: 'Удаление теста',
                method: 'DELETE',
                endpoint: '/api/tests/{{testId}}',
            },
        ],
    },
    'student-workflow': {
        id: 'student-workflow',
        name: 'Прохождение теста студентом',
        steps: [
            {
                name: 'Создание теста',
                method: 'POST',
                endpoint: '/api/tests',
                body: JSON.stringify({
                    title: 'Student Flow {{timestamp}}',
                    description: 'Нагрузочный тест (студент)',
                    durationMinutes: 20,
                    maxAttempts: 1,
                }),
                capture: { testId: extractIdLike },
            },
            {
                name: 'Добавление вопроса',
                method: 'POST',
                endpoint: '/api/tests/{{testId}}/questions',
                body: JSON.stringify({
                    text: 'Вопрос для попытки',
                    type: QUESTION_TYPES.ShortAnswer,
                    points: 1,
                    isRequired: true,
                    answerText: '42',
                    correctAnswer: '42',
                }),
                capture: { questionId: extractIdLike },
            },
            {
                name: 'Публикация теста',
                method: 'PUT',
                endpoint: '/api/tests/{{testId}}/publish',
            },
            {
                name: 'Начало попытки',
                method: 'POST',
                endpoint: '/api/tests/{{testId}}/attempts',
                capture: { attemptId: extractAttemptId },
            },
            {
                name: 'Ответ на вопрос',
                method: 'PUT',
                endpoint: '/api/attempts/{{attemptId}}/answers/{{questionId}}',
                body: JSON.stringify({
                    text: '42',
                }),
            },
            {
                name: 'Завершение попытки',
                method: 'POST',
                endpoint: '/api/attempts/{{attemptId}}/submit',
            },
            {
                name: 'Снятие с публикации',
                method: 'PUT',
                endpoint: '/api/tests/{{testId}}/unpublish',
            },
            {
                name: 'Удаление теста',
                method: 'DELETE',
                endpoint: '/api/tests/{{testId}}',
            },
        ],
    },
    'read-operations': {
        id: 'read-operations',
        name: 'Чтение теста',
        steps: [
            {
                name: 'Создание теста',
                method: 'POST',
                endpoint: '/api/tests',
                body: JSON.stringify({
                    title: 'Read Flow {{timestamp}}',
                    description: 'Нагрузочный тест (чтение)',
                    durationMinutes: 15,
                    maxAttempts: 1,
                }),
                capture: { testId: extractIdLike },
            },
            {
                name: 'Получение списка тестов',
                method: 'GET',
                endpoint: '/api/tests',
            },
            {
                name: 'Получение теста',
                method: 'GET',
                endpoint: '/api/tests/{{testId}}',
            },
            {
                name: 'Получение вопросов',
                method: 'GET',
                endpoint: '/api/tests/{{testId}}/questions',
            },
            {
                name: 'Удаление теста',
                method: 'DELETE',
                endpoint: '/api/tests/{{testId}}',
            },
        ],
    },
};

/**
 * Run load test
 */
export async function runLoadTest({ config, onProgress, signal }) {
    const startTime = Date.now();
    const tracker = new MetricsTracker();
    const baseUrl = getApiBaseUrl('assessment') || window.location.origin;
    const scenario = config.type === 'scenario' ? SCENARIOS[config.scenarioId] : null;

    try {
        if (config.loadType === 'rps') {
            const rateLimiter = createRateLimiter(Math.max(1, config.rps || 1));
            const endTime = startTime + Math.max(1, config.duration || 1) * 1000;

            let index = 0;
            while (Date.now() < endTime && !signal?.aborted) {
                await rateLimiter();
                if (signal?.aborted) break;

                const context = {
                    timestamp: Date.now(),
                    index: index++,
                    randomId: crypto.randomUUID(),
                };

                if (scenario) {
                    const scenarioResults = await executeScenario(scenario, context, baseUrl, signal);
                    scenarioResults.forEach((r) => tracker.addResult(r));
                } else if (config.type === 'endpoint') {
                    const url = resolveUrl(replaceVariables(config.endpoint, context), baseUrl);
                    const body = config.body ? replaceVariables(config.body, context) : undefined;

                    let headers = {};
                    try {
                        headers = config.headers ? JSON.parse(config.headers) : {};
                    } catch (e) {
                        console.warn('Invalid headers JSON');
                    }

                    const result = await executeRequest(config.method, url, body, headers, {signal});
                    tracker.addResult(result);
                }

                if (tracker.shouldUpdate() && onProgress) {
                    onProgress(tracker.getMetrics());
                }
            }
        } else if (config.loadType === 'cycles') {
            const maxConcurrent = 50;
            const inFlight = new Set();

            for (let i = 0; i < config.cycles && !signal?.aborted; i++) {
                const context = {
                    timestamp: Date.now(),
                    index: i,
                    randomId: crypto.randomUUID(),
                };

                const task = (async () => {
                    if (scenario) {
                        const scenarioResults = await executeScenario(scenario, context, baseUrl, signal);
                        scenarioResults.forEach((r) => tracker.addResult(r));
                    } else if (config.type === 'endpoint') {
                        const url = resolveUrl(replaceVariables(config.endpoint, context), baseUrl);
                        const body = config.body ? replaceVariables(config.body, context) : undefined;

                        let headers = {};
                        try {
                            headers = config.headers ? JSON.parse(config.headers) : {};
                        } catch (e) {
                            console.warn('Invalid headers JSON');
                        }

                        const result = await executeRequest(config.method, url, body, headers, {signal});
                        tracker.addResult(result);
                    }

                    if (tracker.shouldUpdate() && onProgress) {
                        onProgress(tracker.getMetrics());
                    }
                })();

                inFlight.add(task);
                task.finally(() => inFlight.delete(task));

                if (inFlight.size >= maxConcurrent) {
                    await Promise.race(inFlight);
                }
            }

            if (inFlight.size > 0) {
                await Promise.all(Array.from(inFlight));
            }
        }

        if (onProgress) {
            onProgress(tracker.getMetrics());
        }
    } catch (error) {
        console.error('Load test error:', error);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const results = tracker.getResults();

    const successfulRequests = results.filter((r) => r.success).length;
    const failedRequests = results.length - successfulRequests;

    const responseTimes = results.map((r) => r.responseTime);
    const averageResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
    const minResponseTime = Math.min(...responseTimes, Infinity);
    const maxResponseTime = Math.max(...responseTimes, 0);

    const requestsPerSecond = duration > 0 ? (results.length / duration) * 1000 : 0;

    const errors = results
        .filter((r) => !r.success)
        .map((r) => ({
            timestamp: r.timestamp,
            error: r.error || `HTTP ${r.statusCode}`,
            statusCode: r.statusCode,
        }));

    const targetLabel = scenario ? scenario.name : `${config.method} ${config.endpoint}`;

    return {
        id: `test-${Date.now()}`,
        timestamp: new Date(startTime),
        testType: config.type,
        scenarioId: config.scenarioId || null,
        targetLabel,
        loadType: config.loadType,
        duration,
        totalRequests: results.length,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        minResponseTime: minResponseTime === Infinity ? 0 : minResponseTime,
        maxResponseTime,
        requestsPerSecond,
        errors,
    };
}
