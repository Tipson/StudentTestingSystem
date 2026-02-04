/**
 * Worker Pool для управления пулом Web Workers
 * Распределяет задачи между воркерами и собирает результаты
 */

export class WorkerPool {
    /**
     * @param {string} workerScript - Путь к скрипту воркера
     * @param {number} size - Количество воркеров в пуле
     */
    constructor(workerSource, size = 4, workerOptions = undefined, poolOptions = {}) {
        const {
            maxTasksPerWorker = 8,
            maxConcurrentTasks = null,
        } = poolOptions;

        this.workerSource = workerSource;
        this.workerOptions = workerOptions;
        this.workerFactory = typeof workerSource === 'function'
            ? workerSource
            : () => new Worker(workerSource, workerOptions);
        this.size = Math.max(1, Math.min(size, 64)); // от 1 до 64 воркеров
        this.maxTasksPerWorker = Math.max(1, Number.isFinite(maxTasksPerWorker) ? maxTasksPerWorker : 8);
        const defaultMaxConcurrent = this.size * this.maxTasksPerWorker;
        this.maxConcurrentTasks = Math.max(
            this.size,
            Number.isFinite(maxConcurrentTasks) ? maxConcurrentTasks : defaultMaxConcurrent
        );
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Map();
        this.nextWorkerId = 0;
        this.taskId = 0;
        this.pendingTasks = new Map();
        this.initialized = false;
        this.terminated = false;
        this.inFlight = 0;
    }

    /**
     * Инициализация воркеров
     */
    async init() {
        if (this.initialized) return;

        const workerPromises = [];

        for (let i = 0; i < this.size; i++) {
            const worker = this.workerFactory();
            const workerId = i;

            worker.onmessage = (e) => this.handleWorkerMessage(workerId, e.data);
            worker.onerror = (error) => this.handleWorkerError(workerId, error);

            this.workers.push(worker);
            this.activeWorkers.set(workerId, 0);

            // Пингуем воркер для проверки готовности
            workerPromises.push(this.pingWorker(worker, workerId));
        }

        await Promise.all(workerPromises);
        this.initialized = true;
    }

    /**
     * Пинг воркера для проверки готовности
     */
    pingWorker(worker, workerId) {
        return new Promise((resolve, reject) => {
            const taskId = `ping-${workerId}`;
            const timeout = setTimeout(() => {
                reject(new Error(`Worker ${workerId} did not respond to ping`));
            }, 5000);

            const handler = (e) => {
                if (e.data.type === 'PONG' && e.data.taskId === taskId) {
                    clearTimeout(timeout);
                    worker.removeEventListener('message', handler);
                    resolve();
                }
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'PING', taskId });
        });
    }

    /**
     * Обработка сообщения от воркера
     */
    handleWorkerMessage(workerId, data) {
        const { type, taskId, results, error } = data;

        if (type === 'TASK_COMPLETE' || type === 'TASK_ERROR') {
            const task = this.pendingTasks.get(taskId);

            if (task) {
                this.pendingTasks.delete(taskId);
                this.releaseWorkerSlot(workerId);

                if (type === 'TASK_COMPLETE') {
                    task.resolve(results);
                } else {
                    task.reject(new Error(error || 'Task failed'));
                }

                // Обрабатываем следующую задачу из очереди
                this.processNextTask();
            }
        }
    }

    /**
     * Обработка ошибки воркера
     */
    handleWorkerError(workerId, error) {
        console.error(`Worker ${workerId} error:`, error);

        // Находим все задачи этого воркера и отклоняем их
        for (const [taskId, task] of this.pendingTasks.entries()) {
            if (task.workerId === workerId) {
                this.pendingTasks.delete(taskId);
                this.releaseWorkerSlot(workerId);
                task.reject(new Error(`Worker ${workerId} crashed: ${error.message}`));
            }
        }

        this.activeWorkers.set(workerId, 0);
        this.processNextTask();
    }

    /**
     * Получить следующего доступного воркера
     * @returns {number|null} - ID воркера или null если все заняты
     */
    getNextAvailableWorker() {
        if (this.terminated || this.workers.length === 0) return null;

        const totalWorkers = this.workers.length;
        for (let i = 0; i < totalWorkers; i++) {
            const workerId = (this.nextWorkerId + i) % totalWorkers;
            const activeCount = this.activeWorkers.get(workerId) || 0;
            if (activeCount < this.maxTasksPerWorker) {
                this.nextWorkerId = (workerId + 1) % totalWorkers;
                return workerId;
            }
        }
        return null;
    }

    /**
     * Обработать следующую задачу из очереди
     */
    processNextTask() {
        if (this.taskQueue.length === 0 || this.terminated) return;

        while (this.taskQueue.length > 0 && !this.terminated) {
            if (this.inFlight >= this.maxConcurrentTasks) return;

            const workerId = this.getNextAvailableWorker();
            if (workerId === null) return;

            const task = this.taskQueue.shift();
            this.executeTaskOnWorker(workerId, task);
        }
    }

    /**
     * Выполнить задачу на конкретном воркере
     */
    executeTaskOnWorker(workerId, task) {
        this.inFlight += 1;
        const activeCount = this.activeWorkers.get(workerId) || 0;
        this.activeWorkers.set(workerId, activeCount + 1);
        task.workerId = workerId;

        const worker = this.workers[workerId];
        worker.postMessage({
            type: task.type,
            taskId: task.taskId,
            payload: task.payload,
        });
    }

    /**
     * Выполнить задачу (endpoint запрос)
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Array>} - Результаты запроса
     */
    executeEndpoint(config) {
        const taskId = `task-${this.taskId++}`;

        return new Promise((resolve, reject) => {
            if (this.terminated) {
                reject(new Error('Worker pool terminated'));
                return;
            }

            const task = {
                taskId,
                type: 'EXECUTE_ENDPOINT',
                payload: config,
                resolve,
                reject,
            };

            this.pendingTasks.set(taskId, task);

            if (this.inFlight >= this.maxConcurrentTasks) {
                this.taskQueue.push(task);
                return;
            }

            const workerId = this.getNextAvailableWorker();
            if (workerId === null) {
                this.taskQueue.push(task);
                return;
            }

            this.executeTaskOnWorker(workerId, task);
        });
    }

    /**
     * Выполнить сценарий
     * @param {Object} config - Конфигурация сценария
     * @returns {Promise<Array>} - Результаты сценария
     */
    executeScenario(config) {
        const taskId = `task-${this.taskId++}`;

        return new Promise((resolve, reject) => {
            if (this.terminated) {
                reject(new Error('Worker pool terminated'));
                return;
            }

            const task = {
                taskId,
                type: 'EXECUTE_SCENARIO',
                payload: config,
                resolve,
                reject,
            };

            this.pendingTasks.set(taskId, task);

            if (this.inFlight >= this.maxConcurrentTasks) {
                this.taskQueue.push(task);
                return;
            }

            const workerId = this.getNextAvailableWorker();
            if (workerId === null) {
                this.taskQueue.push(task);
                return;
            }

            this.executeTaskOnWorker(workerId, task);
        });
    }

    /**
     * Получить статистику пула
     */
    getStats() {
        const activeCount = Array.from(this.activeWorkers.values()).reduce((sum, count) => sum + count, 0);
        const busyWorkers = Array.from(this.activeWorkers.values()).filter(count => count > 0).length;

        return {
            totalWorkers: this.size,
            activeWorkers: activeCount,
            idleWorkers: Math.max(this.size - busyWorkers, 0),
            queuedTasks: this.taskQueue.length,
            pendingTasks: this.pendingTasks.size,
            inFlight: this.inFlight,
            maxConcurrentTasks: this.maxConcurrentTasks,
            maxTasksPerWorker: this.maxTasksPerWorker,
        };
    }

    /**
     * Ожидание завершения всех активных задач
     */
    async waitForIdle() {
        while (this.pendingTasks.size > 0 || this.taskQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    /**
     * Остановить все воркеры
     */
    async terminate() {
        this.terminated = true;

        // Отклоняем все ожидающие задачи
        for (const [taskId, task] of this.pendingTasks.entries()) {
            task.reject(new Error('Worker pool terminated'));
        }
        this.pendingTasks.clear();
        this.taskQueue = [];
        this.inFlight = 0;

        // Останавливаем всех воркеров
        for (const worker of this.workers) {
            worker.terminate();
        }

        this.workers = [];
        this.activeWorkers.clear();
        this.initialized = false;
    }

    releaseWorkerSlot(workerId) {
        this.inFlight = Math.max(0, this.inFlight - 1);
        const activeCount = this.activeWorkers.get(workerId) || 0;
        this.activeWorkers.set(workerId, Math.max(0, activeCount - 1));
    }
}
