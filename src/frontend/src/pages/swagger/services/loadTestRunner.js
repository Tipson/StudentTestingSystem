/**
 * Service for running load tests against API endpoints
 * Использует Web Workers и Token Bucket Rate Limiter для точного контроля нагрузки
 */
import { getAccessToken } from '@api/auth.js';
import { getApiBaseUrl } from '@api/config.js';
import { QUESTION_TYPES } from '../constants/autotest.js';
import { WorkerPool } from '../utils/workerPool.js';
import { TokenBucketRateLimiter } from '../utils/rateLimiter.js';
import { MetricsAggregator } from '../utils/metricsAggregator.js';

const ABSOLUTE_URL = /^https?:\/\//i;

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

function parseJsonOrThrow(value, label) {
    if (value === null || value === undefined || value === '') return {};
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error(`Invalid JSON in field "${label}"`);
    }
}

function serializeExtractorForWorker(extractor) {
    if (!extractor) return extractor;
    if (typeof extractor === 'function') {
        if (extractor === extractIdLike) {
            return { type: 'extractIdLike' };
        }
        if (extractor === extractAttemptId) {
            return { type: 'extractAttemptId' };
        }
        return null;
    }
    if (Array.isArray(extractor)) {
        return extractor.map(item => serializeExtractorForWorker(item));
    }
    return extractor;
}

function serializeCaptureForWorker(capture) {
    if (!capture) return capture;
    const result = {};
    Object.entries(capture).forEach(([key, extractor]) => {
        result[key] = serializeExtractorForWorker(extractor);
    });
    return result;
}

function serializeScenarioForWorker(scenario) {
    if (!scenario) return scenario;
    return {
        ...scenario,
        steps: scenario.steps.map(step => ({
            ...step,
            capture: serializeCaptureForWorker(step.capture),
        })),
    };
}


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

async function executeScenarioSteps(scenario, context, baseUrl, accessToken) {
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

        if (!result.success) {
            break;
        }
    }

    return results;
}

class LocalTaskRunner {
    constructor(maxConcurrentTasks = 16) {
        this.maxConcurrentTasks = Math.max(1, maxConcurrentTasks);
        this.inFlight = 0;
        this.queue = [];
        this.terminated = false;
    }

    executeEndpoint(config) {
        return this.enqueue(async () => {
            const { method, endpoint, body, headers, context, baseUrl, accessToken } = config;
            const url = resolveUrl(replaceVariables(endpoint, context), baseUrl);
            const processedBody = body ? replaceVariables(body, context) : undefined;
            return [await executeRequest(method, url, processedBody, headers || {}, accessToken, false)];
        });
    }

    executeScenario(config) {
        return this.enqueue(async () => {
            const { scenario, context, baseUrl, accessToken } = config;
            return executeScenarioSteps(scenario, context, baseUrl, accessToken);
        });
    }

    enqueue(taskFactory) {
        return new Promise((resolve, reject) => {
            if (this.terminated) {
                reject(new Error('Task runner terminated'));
                return;
            }

            const runTask = () => {
                this.inFlight += 1;
                Promise.resolve()
                    .then(taskFactory)
                    .then(resolve, reject)
                    .finally(() => {
                        this.inFlight = Math.max(0, this.inFlight - 1);
                        this.processNext();
                    });
            };

            if (this.inFlight < this.maxConcurrentTasks) {
                runTask();
            } else {
                this.queue.push({ runTask, reject });
            }
        });
    }

    processNext() {
        while (!this.terminated && this.queue.length > 0 && this.inFlight < this.maxConcurrentTasks) {
            const task = this.queue.shift();
            if (task) {
                task.runTask();
            }
        }
    }

    async waitForIdle() {
        while (!this.terminated && (this.inFlight > 0 || this.queue.length > 0)) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    async terminate() {
        this.terminated = true;
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                task.reject(new Error('Task runner terminated'));
            }
        }
        this.inFlight = 0;
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
 * Run load test using Worker Pool
 */
export async function runLoadTest({ config, onProgress, signal }) {
    const startTime = Date.now();
    const metricsAggregator = new MetricsAggregator();
    const baseUrl = getApiBaseUrl('assessment') || window.location.origin;
    const scenario = config.type === 'scenario' ? SCENARIOS[config.scenarioId] : null;
    const scenarioForWorker = scenario ? serializeScenarioForWorker(scenario) : null;

    if (config.type === 'scenario' && !scenario) {
        throw new Error('Scenario not found');
    }
    if (config.type === 'endpoint' && !config.endpoint) {
        throw new Error('Endpoint is required');
    }

    // Определяем количество воркеров (по умолчанию 4, можно настроить)
    const workerCount = Math.max(1, config.workerCount || 4);
    const maxConcurrentTasks = Math.max(workerCount, config.maxConcurrency || workerCount * 8);
    const maxTasksPerWorker = Math.max(1, Math.ceil(maxConcurrentTasks / workerCount));
    const useWorkers = Boolean(config.useWorkers);

    let taskRunner = null;
    let workerPool = null;

    if (useWorkers && typeof Worker !== 'undefined') {
        const workerFactory = () => new Worker(
            new URL('../workers/loadTestWorker.js', import.meta.url),
            { type: 'module' }
        );

        workerPool = new WorkerPool(workerFactory, workerCount, undefined, {
            maxConcurrentTasks,
            maxTasksPerWorker,
        });

        try {
            const initTimeoutMs = Math.max(500, Number(config.workerInitTimeoutMs) || 2000);
            await Promise.race([
                workerPool.init(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Worker pool init timeout')), initTimeoutMs)),
            ]);
            taskRunner = workerPool;
            console.info('[LoadTest] Using worker pool');
        } catch (error) {
            console.warn('Worker pool init failed, falling back to main thread runner:', error);
            await workerPool.terminate();
            workerPool = null;
        }
    }

    if (!taskRunner) {
        taskRunner = new LocalTaskRunner(maxConcurrentTasks);
        console.info('[LoadTest] Using main thread runner');
    }

    try {

        // Access token (with timeout)
        let accessToken = null;
        try {
            const tokenTimeoutMs = Math.max(500, Number(config.accessTokenTimeoutMs) || 3000);
            accessToken = await Promise.race([
                getAccessToken(false),
                new Promise((resolve) => setTimeout(() => resolve(null), tokenTimeoutMs)),
            ]);
        } catch (error) {
            accessToken = null;
            console.warn('[LoadTest] Access token error, proceeding without token:', error);
        }

        if (!accessToken) {
            console.warn('[LoadTest] Access token not available, requests will be unauthenticated');
        }

        if (config.loadType === 'rps') {
            // Режим RPS: используем Token Bucket Rate Limiter
            const rateLimiter = new TokenBucketRateLimiter(Math.max(1, config.rps || 1));
            const endTime = startTime + Math.max(1, config.duration || 1) * 1000;

            let index = 0;

            while (Date.now() < endTime && !signal?.aborted) {
                // Ждем разрешения от rate limiter
                await rateLimiter.acquire();

                if (signal?.aborted) break;

                const context = {
                    timestamp: Date.now(),
                    index: index++,
                    randomId: crypto.randomUUID(),
                };

                // Выполняем запрос через Worker Pool
                const taskPromise = scenario
                    ? taskRunner.executeScenario({
                        scenario: useWorkers ? scenarioForWorker : scenario,
                        context,
                        baseUrl,
                        accessToken,
                    })
                    : taskRunner.executeEndpoint({
                        method: config.method,
                        endpoint: config.endpoint,
                        body: config.body,
                        headers: parseJsonOrThrow(config.headers, '���������'),
                        context,
                        baseUrl,
                        accessToken,
                    });

                // Обрабатываем результаты асинхронно
                taskPromise.then(results => {
                    metricsAggregator.addResults(results);

                    if (metricsAggregator.shouldUpdate() && onProgress) {
                        onProgress(metricsAggregator.getMetrics());
                    }
                }).catch(error => {
                    console.error('Task error:', error);
                    metricsAggregator.addResult({
                        success: false,
                        responseTime: 0,
                        error: error.message,
                        timestamp: Date.now(),
                    });
                });
            }

            // Ждем завершения всех активных задач
            await taskRunner.waitForIdle();

        } else if (config.loadType === 'cycles') {
            // Режим Cycles: выполняем заданное количество циклов
            const promises = [];

            for (let i = 0; i < config.cycles && !signal?.aborted; i++) {
                const context = {
                    timestamp: Date.now(),
                    index: i,
                    randomId: crypto.randomUUID(),
                };

                const taskPromise = scenario
                    ? taskRunner.executeScenario({
                        scenario: useWorkers ? scenarioForWorker : scenario,
                        context,
                        baseUrl,
                        accessToken,
                    })
                    : taskRunner.executeEndpoint({
                        method: config.method,
                        endpoint: config.endpoint,
                        body: config.body,
                        headers: parseJsonOrThrow(config.headers, '���������'),
                        context,
                        baseUrl,
                        accessToken,
                    });

                promises.push(
                    taskPromise.then(results => {
                        metricsAggregator.addResults(results);

                        if (metricsAggregator.shouldUpdate() && onProgress) {
                            onProgress(metricsAggregator.getMetrics());
                        }
                    }).catch(error => {
                        console.error('Task error:', error);
                        metricsAggregator.addResult({
                            success: false,
                            responseTime: 0,
                            error: error.message,
                            timestamp: Date.now(),
                        });
                    })
                );
            }

            await Promise.all(promises);
        }

        // Финальное обновление метрик
        if (onProgress) {
            onProgress(metricsAggregator.getMetrics());
        }

    } catch (error) {
        console.error('Load test error:', error);
        throw error;
    } finally {
        // Останавливаем Worker Pool
        await taskRunner.terminate();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const targetLabel = scenario ? scenario.name : `${config.method} ${config.endpoint}`;

    // Экспортируем финальный отчет
    const report = metricsAggregator.exportReport({
        type: config.type,
        testType: config.type,
        scenarioId: config.scenarioId || null,
        targetLabel,
        loadType: config.loadType,
        rps: config.rps,
        duration: config.duration,
        cycles: config.cycles,
        workerCount,
        maxConcurrency: maxConcurrentTasks,
        maxTasksPerWorker,
    });

    return {
        ...report,
        id: `test-${Date.now()}`,
        timestamp: new Date(startTime),
        duration,
    };
}
