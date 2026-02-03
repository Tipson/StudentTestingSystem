/**
 * Worker Pool для управления пулом Web Workers
 * Распределяет задачи между воркерами и собирает результаты
 */

export class WorkerPool {
    /**
     * @param {string} workerScript - Путь к скрипту воркера
     * @param {number} size - Количество воркеров в пуле
     */
    constructor(workerSource, size = 4, workerOptions = undefined) {
        this.workerSource = workerSource;
        this.workerOptions = workerOptions;
        this.workerFactory = typeof workerSource === 'function'
            ? workerSource
            : () => new Worker(workerSource, workerOptions);
        this.size = Math.max(1, Math.min(size, 16)); // от 1 до 16 воркеров
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Map();
        this.nextWorkerId = 0;
        this.taskId = 0;
        this.pendingTasks = new Map();
        this.initialized = false;
        this.terminated = false;
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
            this.activeWorkers.set(workerId, false);

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
                this.activeWorkers.set(workerId, false);

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
                task.reject(new Error(`Worker ${workerId} crashed: ${error.message}`));
            }
        }

        this.activeWorkers.set(workerId, false);
    }

    /**
     * Получить следующего доступного воркера
     * @returns {number|null} - ID воркера или null если все заняты
     */
    getNextAvailableWorker() {
        for (const [workerId, isActive] of this.activeWorkers.entries()) {
            if (!isActive && !this.terminated) {
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

        const workerId = this.getNextAvailableWorker();
        if (workerId === null) return;

        const task = this.taskQueue.shift();
        this.executeTaskOnWorker(workerId, task);
    }

    /**
     * Выполнить задачу на конкретном воркере
     */
    executeTaskOnWorker(workerId, task) {
        this.activeWorkers.set(workerId, true);
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
            const task = {
                taskId,
                type: 'EXECUTE_ENDPOINT',
                payload: config,
                resolve,
                reject,
            };

            this.pendingTasks.set(taskId, task);

            const workerId = this.getNextAvailableWorker();
            if (workerId !== null) {
                this.executeTaskOnWorker(workerId, task);
            } else {
                this.taskQueue.push(task);
            }
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
            const task = {
                taskId,
                type: 'EXECUTE_SCENARIO',
                payload: config,
                resolve,
                reject,
            };

            this.pendingTasks.set(taskId, task);

            const workerId = this.getNextAvailableWorker();
            if (workerId !== null) {
                this.executeTaskOnWorker(workerId, task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    /**
     * Получить статистику пула
     */
    getStats() {
        const activeCount = Array.from(this.activeWorkers.values()).filter(Boolean).length;

        return {
            totalWorkers: this.size,
            activeWorkers: activeCount,
            idleWorkers: this.size - activeCount,
            queuedTasks: this.taskQueue.length,
            pendingTasks: this.pendingTasks.size,
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

        // Останавливаем всех воркеров
        for (const worker of this.workers) {
            worker.terminate();
        }

        this.workers = [];
        this.activeWorkers.clear();
        this.initialized = false;
    }
}
