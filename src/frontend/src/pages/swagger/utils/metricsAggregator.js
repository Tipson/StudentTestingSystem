/**
 * Metrics Aggregator
 * Собирает и анализирует метрики нагрузочного тестирования
 * Поддерживает расчет percentiles, RPS, latency и других показателей
 */

export class MetricsAggregator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // обновление каждые 100ms
        this.responseTimes = [];
        this.rpsWindowMs = 5000;
        this.rpsTimestamps = [];
        this.rpsCursor = 0;
    }

    /**
     * Добавить результат запроса
     * @param {Object} result - Результат запроса
     */
    addResult(result) {
        this.results.push(result);
        if (result.success && result.responseTime) {
            this.responseTimes.push(result.responseTime);
        }
        if (result.timestamp) {
            this.rpsTimestamps.push(result.timestamp);
        }
    }

    /**
     * Добавить несколько результатов
     * @param {Array} results - Массив результатов
     */
    addResults(results) {
        for (const result of results) {
            this.addResult(result);
        }
    }

    /**
     * Проверить, нужно ли обновлять метрики
     * @returns {boolean}
     */
    shouldUpdate() {
        const now = Date.now();
        if (now - this.lastUpdateTime >= this.updateInterval) {
            this.lastUpdateTime = now;
            return true;
        }
        return false;
    }

    /**
     * Вычислить percentile
     * @param {Array<number>} values - Массив значений
     * @param {number} percentile - Процентиль (0-100)
     * @returns {number}
     */
    static calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;

        if (lower === upper) {
            return sorted[lower];
        }

        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    /**
     * Вычислить стандартное отклонение
     * @param {Array<number>} values - Массив значений
     * @param {number} mean - Среднее значение
     * @returns {number}
     */
    static calculateStdDev(values, mean) {
        if (values.length === 0) return 0;

        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Получить текущие метрики
     * @returns {Object} - Объект с метриками
     */
    getMetrics() {
        const now = Date.now();
        const elapsedTime = now - this.startTime;
        const elapsedSeconds = elapsedTime / 1000;

        const totalRequests = this.results.length;
        const successfulRequests = this.results.filter(r => r.success).length;
        const failedRequests = totalRequests - successfulRequests;

        // Базовые метрики
        const averageResponseTime = this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;

        const averageRPS = elapsedSeconds > 0 ? totalRequests / elapsedSeconds : 0;

        const windowMs = this.rpsWindowMs;
        const cutoff = now - windowMs;
        while (this.rpsCursor < this.rpsTimestamps.length && this.rpsTimestamps[this.rpsCursor] < cutoff) {
            this.rpsCursor += 1;
        }
        if (this.rpsCursor > 1000) {
            this.rpsTimestamps = this.rpsTimestamps.slice(this.rpsCursor);
            this.rpsCursor = 0;
        }
        const rollingCount = this.rpsTimestamps.length - this.rpsCursor;
        const currentRPS = rollingCount / (windowMs / 1000);

        // Percentiles
        const p50 = MetricsAggregator.calculatePercentile(this.responseTimes, 50);
        const p95 = MetricsAggregator.calculatePercentile(this.responseTimes, 95);
        const p99 = MetricsAggregator.calculatePercentile(this.responseTimes, 99);

        // Min/Max
        const minResponseTime = this.responseTimes.length > 0
            ? Math.min(...this.responseTimes)
            : 0;
        const maxResponseTime = this.responseTimes.length > 0
            ? Math.max(...this.responseTimes)
            : 0;

        // Стандартное отклонение
        const stdDev = MetricsAggregator.calculateStdDev(this.responseTimes, averageResponseTime);

        // Расчет успешности
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

        // Распределение кодов ответа
        const statusCodes = {};
        for (const result of this.results) {
            if (result.statusCode) {
                statusCodes[result.statusCode] = (statusCodes[result.statusCode] || 0) + 1;
            }
        }

        // Скользящее окно RPS (последняя секунда)
        const recentRPS = currentRPS;

        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            successRate,
            elapsedTime,
            elapsedSeconds,

            // RPS метрики
            currentRPS,
            averageRPS,
            recentRPS,

            // Latency метрики
            averageResponseTime,
            minResponseTime,
            maxResponseTime,
            stdDevResponseTime: stdDev,

            // Percentiles
            p50,
            p95,
            p99,

            // Распределение
            statusCodes,
        };
    }

    /**
     * Получить детальную статистику по ошибкам
     * @returns {Array} - Массив ошибок с группировкой
     */
    getErrorStats() {
        const errorMap = new Map();

        for (const result of this.results) {
            if (!result.success) {
                const errorKey = result.error || `HTTP ${result.statusCode}`;
                const existing = errorMap.get(errorKey) || { count: 0, timestamps: [] };
                existing.count++;
                existing.timestamps.push(result.timestamp);
                errorMap.set(errorKey, existing);
            }
        }

        return Array.from(errorMap.entries()).map(([error, data]) => ({
            error,
            count: data.count,
            percentage: (data.count / this.results.length) * 100,
            firstOccurrence: Math.min(...data.timestamps),
            lastOccurrence: Math.max(...data.timestamps),
        })).sort((a, b) => b.count - a.count);
    }

    /**
     * Получить результаты по временным интервалам
     * @param {number} bucketSize - Размер интервала в миллисекундах
     * @returns {Array} - Массив интервалов с метриками
     */
    getTimeBuckets(bucketSize = 1000) {
        const buckets = new Map();

        for (const result of this.results) {
            const bucketTime = Math.floor((result.timestamp - this.startTime) / bucketSize) * bucketSize;

            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, {
                    timestamp: bucketTime,
                    requests: 0,
                    successful: 0,
                    failed: 0,
                    responseTimes: [],
                });
            }

            const bucket = buckets.get(bucketTime);
            bucket.requests++;

            if (result.success) {
                bucket.successful++;
                if (result.responseTime) {
                    bucket.responseTimes.push(result.responseTime);
                }
            } else {
                bucket.failed++;
            }
        }

        return Array.from(buckets.values()).map(bucket => ({
            timestamp: bucket.timestamp,
            requests: bucket.requests,
            successful: bucket.successful,
            failed: bucket.failed,
            rps: bucket.requests / (bucketSize / 1000),
            averageResponseTime: bucket.responseTimes.length > 0
                ? bucket.responseTimes.reduce((a, b) => a + b, 0) / bucket.responseTimes.length
                : 0,
        })).sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Получить все результаты
     * @returns {Array}
     */
    getResults() {
        return this.results;
    }

    /**
     * Очистить все данные
     */
    clear() {
        this.results = [];
        this.responseTimes = [];
        this.startTime = Date.now();
        this.lastUpdateTime = 0;
        this.rpsTimestamps = [];
        this.rpsCursor = 0;
    }

    /**
     * Экспортировать финальный отчет
     * @param {Object} config - Конфигурация теста
     * @returns {Object} - Детальный отчет
     */
    exportReport(config = {}) {
        const metrics = this.getMetrics();
        const errorStats = this.getErrorStats();
        const timeBuckets = this.getTimeBuckets(1000);

        const errors = this.results
            .filter(r => !r.success)
            .slice(0, 100) // Первые 100 ошибок
            .map(r => ({
                timestamp: r.timestamp,
                error: r.error || `HTTP ${r.statusCode}`,
                statusCode: r.statusCode,
            }));

        return {
            id: `test-${Date.now()}`,
            timestamp: new Date(this.startTime),
            config,
            duration: metrics.elapsedTime,

            // Основные метрики
            totalRequests: metrics.totalRequests,
            successfulRequests: metrics.successfulRequests,
            failedRequests: metrics.failedRequests,
            successRate: metrics.successRate,

            // RPS
            requestsPerSecond: metrics.averageRPS ?? metrics.currentRPS,
            targetRPS: config.rps,
            rpsAccuracy: config.rps ? ((metrics.averageRPS ?? metrics.currentRPS) / config.rps) * 100 : 0,

            // Latency
            averageResponseTime: metrics.averageResponseTime,
            minResponseTime: metrics.minResponseTime,
            maxResponseTime: metrics.maxResponseTime,
            stdDevResponseTime: metrics.stdDevResponseTime,

            // Percentiles
            p50: metrics.p50,
            p95: metrics.p95,
            p99: metrics.p99,

            // Ошибки
            errors,
            errorStats,

            // Временные интервалы
            timeBuckets,

            // Распределение статусов
            statusCodes: metrics.statusCodes,
        };
    }
}