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

    if (config.type === 'scenario' && !scenario) {
        throw new Error('Scenario not found');
    }
    if (config.type === 'endpoint' && !config.endpoint) {
        throw new Error('Endpoint is required');
    }
    
    // Определяем количество воркеров (по умолчанию 4, можно настроить)
    const workerCount = config.workerCount || 4;
    
    // Инициализируем Worker Pool
    const workerFactory = () => new Worker(
        new URL('../workers/loadTestWorker.js', import.meta.url),
        { type: 'module' }
    );
    const workerPool = new WorkerPool(workerFactory, workerCount);
    
    try {
        // Инициализируем пул воркеров
        await workerPool.init();
        
        // Получаем access token один раз для всех запросов
        const accessToken = await getAccessToken(false);

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
                    ? workerPool.executeScenario({
                          scenario,
                          context,
                          baseUrl,
                          accessToken,
                      })
                    : workerPool.executeEndpoint({
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
            await workerPool.waitForIdle();

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
                    ? workerPool.executeScenario({
                          scenario,
                          context,
                          baseUrl,
                          accessToken,
                      })
                    : workerPool.executeEndpoint({
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
        await workerPool.terminate();
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
    });

    return {
        ...report,
        id: `test-${Date.now()}`,
        timestamp: new Date(startTime),
        duration,
    };
}

