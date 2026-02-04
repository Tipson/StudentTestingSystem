/**
 * Load Test Scheduler
 * Планирует выполнение запросов с точным контролем RPS
 * без блокировки основного потока выполнения
 */

export class LoadTestScheduler {
    /**
     * @param {number} rps - Целевое количество запросов в секунду
     */
    constructor(rps) {
        this.rps = Math.max(1, rps);
        this.interval = 1000 / this.rps; // миллисекунды между запросами
    }

    /**
     * Получить задержку для запроса с индексом index
     * @param {number} index - Индекс запроса (начиная с 0)
     * @returns {number} - Задержка в миллисекундах
     */
    getDelayForRequest(index) {
        return Math.floor(index * this.interval);
    }

    /**
     * Рассчитать общее количество запросов для заданной длительности
     * @param {number} durationSeconds - Длительность в секундах
     * @returns {number} - Количество запросов
     */
    getTotalRequests(durationSeconds) {
        return Math.floor(this.rps * durationSeconds);
    }

    /**
     * Создать асинхронный генератор запросов с точным тайм��нгом
     * @param {number} totalRequests - Общее количество запросов
     * @param {Function} taskFactory - Функция создания задачи: (index) => Promise
     * @param {Object} signal - AbortSignal для отмены
     * @returns {Promise<Array>} - Массив промисов всех задач
     */
    async scheduleRequests(totalRequests, taskFactory, signal = null) {
        const promises = [];
        const startTime = Date.now();

        for (let i = 0; i < totalRequests; i++) {
            if (signal?.aborted) break;

            const targetTime = startTime + this.getDelayForRequest(i);
            
            // Создаем промис с задержкой до целевого времени
            const promise = this.createDelayedTask(targetTime, i, taskFactory, signal);
            promises.push(promise);
        }

        return promises;
    }

    /**
     * Создать задачу с задержкой до целевого времени
     * @private
     */
    createDelayedTask(targetTime, index, taskFactory, signal) {
        return new Promise((resolve) => {
            const now = Date.now();
            const delay = Math.max(0, targetTime - now);

            setTimeout(() => {
                if (signal?.aborted) {
                    resolve({ cancelled: true, index });
                    return;
                }

                // Выполняем задачу и передаем результат
                Promise.resolve(taskFactory(index))
                    .then(result => resolve({ success: true, result, index }))
                    .catch(error => resolve({ success: false, error, index }));
            }, delay);
        });
    }

    /**
     * Запланировать запросы с интервалами и выполнить их
     * Альтернативный метод с использованием интервального подхода
     * @param {number} durationSeconds - Длительность в секундах
     * @param {Function} taskFactory - Функция создания задачи
     * @param {Function} onProgress - Callback для прогресса
     * @param {Object} signal - AbortSignal для отмены
     */
    async runWithInterval(durationSeconds, taskFactory, onProgress, signal = null) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        let index = 0;
        const promises = [];

        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (signal?.aborted || Date.now() >= endTime) {
                    clearInterval(intervalId);
                    
                    // Ждем завершения всех запущенных задач
                    Promise.allSettled(promises).then(() => {
                        resolve({
                            totalScheduled: index,
                            completed: promises.length,
                        });
                    });
                    return;
                }

                // Запускаем задачу асинхронно
                const promise = Promise.resolve(taskFactory(index))
                    .then(result => {
                        if (onProgress) onProgress({ index, result });
                        return result;
                    })
                    .catch(error => {
                        if (onProgress) onProgress({ index, error });
                        return error;
                    });

                promises.push(promise);
                index++;
            }, this.interval);
        });
    }

    /**
     * Получить статистику планировщика
     * @param {number} durationSeconds - Длительность теста
     * @returns {Object}
     */
    getStats(durationSeconds) {
        const totalRequests = this.getTotalRequests(durationSeconds);
        const actualInterval = 1000 / this.rps;

        return {
            rps: this.rps,
            interval: this.interval,
            actualInterval,
            totalRequests,
            expectedDuration: (totalRequests * this.interval) / 1000,
        };
    }
}

/**
 * Utility функция для запуска нагрузочного теста с планировщиком
 * @param {Object} config - Конфигурация теста
 * @returns {Promise}
 */
export async function runScheduledLoadTest(config) {
    const {
        rps,
        durationSeconds,
        taskFactory,
        onProgress,
        signal,
        mode = 'all-at-once', // 'all-at-once' или 'interval'
    } = config;

    const scheduler = new LoadTestScheduler(rps);

    if (mode === 'interval') {
        return scheduler.runWithInterval(durationSeconds, taskFactory, onProgress, signal);
    }

    // Режим 'all-at-once' - создаем все промисы сразу
    const totalRequests = scheduler.getTotalRequests(durationSeconds);
    const promises = await scheduler.scheduleRequests(totalRequests, taskFactory, signal);

    // Ждем завершения всех задач
    const results = await Promise.allSettled(promises);

    return {
        totalScheduled: totalRequests,
        results: results.map(r => r.value),
    };
}
