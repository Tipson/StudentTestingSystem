/**
 * Token Bucket Rate Limiter
 * Обеспечивает точный контроль запросов в секунду (RPS)
 * с возможностью небольших всплесков (burst)
 */

export class TokenBucketRateLimiter {
    /**
     * @param {number} rps - Целевое количество запросов в секунду
     * @param {number} burstSize - Максимальный размер всплеска (по умолчанию = rps)
     */
    constructor(rps, burstSize = null) {
        this.rps = Math.max(1, rps);
        this.capacity = burstSize ?? this.rps;
        this.tokens = this.capacity;
        this.lastRefill = performance.now();
        this.refillRate = this.rps; // токенов в секунду
    }

    /**
     * Пополнить токены на основе прошедшего времени
     */
    refill() {
        const now = performance.now();
        const timePassed = (now - this.lastRefill) / 1000; // в секундах
        const tokensToAdd = timePassed * this.refillRate;

        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Попытаться получить токен
     * @returns {Promise<void>} - Резолвится когда токен доступен
     */
    async acquire() {
        while (true) {
            this.refill();

            if (this.tokens >= 1) {
                this.tokens -= 1;
                return;
            }

            // Вычисляем время ожидания до следующего токена
            const tokensNeeded = 1 - this.tokens;
            const waitTime = (tokensNeeded / this.refillRate) * 1000; // в миллисекундах

            // Добавляем небольшой buffer для точности
            await new Promise(resolve => setTimeout(resolve, Math.max(1, waitTime * 0.95)));
        }
    }

    /**
     * Попытаться получить несколько токенов
     * @param {number} count - Количество токенов
     * @returns {boolean} - true если токены получены, false иначе
     */
    tryAcquire(count = 1) {
        this.refill();

        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }

        return false;
    }

    /**
     * Получить количество доступных токенов
     * @returns {number}
     */
    getAvailableTokens() {
        this.refill();
        return this.tokens;
    }

    /**
     * Сбросить rate limiter
     */
    reset() {
        this.tokens = this.capacity;
        this.lastRefill = performance.now();
    }

    /**
     * Изменить RPS на лету
     * @param {number} newRps
     */
    setRps(newRps) {
        this.refill(); // Сначала пополняем с текущим rate
        this.rps = Math.max(1, newRps);
        this.refillRate = this.rps;
        this.capacity = this.rps;
        this.tokens = Math.min(this.tokens, this.capacity);
    }
}

/**
 * Sliding Window Rate Limiter
 * Альтернативная реализация для более равномерного распределения
 */
export class SlidingWindowRateLimiter {
    /**
     * @param {number} rps - Целевое количество запросов в секунду
     * @param {number} windowSize - Размер окна в миллисекундах (по умолчанию 1000ms)
     */
    constructor(rps, windowSize = 1000) {
        this.rps = Math.max(1, rps);
        this.windowSize = windowSize;
        this.requests = [];
    }

    /**
     * Очистка старых запросов вне окна
     */
    cleanup() {
        const now = performance.now();
        const cutoff = now - this.windowSize;
        this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    }

    /**
     * Попытаться получить разрешение на запрос
     * @returns {Promise<void>}
     */
    async acquire() {
        while (true) {
            this.cleanup();

            if (this.requests.length < this.rps) {
                this.requests.push(performance.now());
                return;
            }

            // Найдем самый старый запрос и подождем, пока он выйдет из окна
            const oldestRequest = this.requests[0];
            const waitTime = (oldestRequest + this.windowSize) - performance.now();

            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.max(1, waitTime)));
            }
        }
    }

    /**
     * Получить текущий RPS
     * @returns {number}
     */
    getCurrentRps() {
        this.cleanup();
        return (this.requests.length / this.windowSize) * 1000;
    }

    /**
     * Сбросить rate limiter
     */
    reset() {
        this.requests = [];
    }

    /**
     * Изменить RPS на лету
     * @param {number} newRps
     */
    setRps(newRps) {
        this.rps = Math.max(1, newRps);
    }
}