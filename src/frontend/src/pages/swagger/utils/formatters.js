/**
 * Утилиты форматирования
 */

import { MAX_AUTOTEST_MESSAGE_LENGTH } from '../constants/autotest.js';

/**
 * Форматирует токен для отображения
 * (показывает начало и конец строки)
 * @param {string} token - JWT или access-токен
 * @returns {string} Отформатированный предпросмотр токена
 */
export const formatToken = (token) => {
    if (!token) return '';
    return `${token.slice(0, 14)}...${token.slice(-10)}`;
};

/**
 * Форматирует ответ API для отображения
 * @param {Object} payload - Объект ответа с полем data
 * @returns {string} Отформатированная строка JSON
 */
export const formatResponse = (payload) => {
    if (!payload || payload.data == null) return '';
    if (typeof payload.data === 'string') return payload.data;
    try {
        return JSON.stringify(payload.data, null, 2);
    } catch (error) {
        return String(payload.data);
    }
};

/**
 * Форматирует дату и время для русской локали
 * @param {number|string|Date} value - Значение даты
 * @returns {string} Отформатированная строка даты
 */
export const formatDateTime = (value) => {
    if (value == null || value === '') return '';
    const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ru-RU');
};

/**
 * Форматирует пример тела запроса/ответа для отображения
 * @param {*} example - Пример значения
 * @returns {string} Отформатированная строка JSON
 */
export const formatBodyExample = (example) => {
    if (example == null) return '';
    if (typeof example === 'string') {
        try {
            return JSON.stringify(JSON.parse(example), null, 2);
        } catch (error) {
            return JSON.stringify(example);
        }
    }
    try {
        return JSON.stringify(example, null, 2);
    } catch (error) {
        return String(example);
    }
};

/**
 * Ограничивает длину сообщения автотеста
 * @param {*} value - Значение сообщения
 * @returns {string} Обрезанное сообщение
 */
export const limitAutoTestMessage = (value) => {
    if (value == null) return '';
    const text =
        typeof value === 'string'
            ? value
            : value?.message
                ? value.message
                : formatBodyExample(value);

    if (text.length <= MAX_AUTOTEST_MESSAGE_LENGTH) return text;
    return `${text.slice(0, MAX_AUTOTEST_MESSAGE_LENGTH)}...`;
};

/**
 * Форматирует ответ автотеста для отображения
 * @param {*} value - Значение ответа
 * @returns {string} Отформатированная строка
 */
export const formatAutoTestResponse = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch (error) {
            return value;
        }
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch (error) {
        return String(value);
    }
};

/**
 * Форматирует список выбранных файлов для отображения
 * @param {File[]} files - Массив объектов File
 * @returns {string} Имена файлов, разделённые запятыми
 */
export const formatSelectedFiles = (files) =>
    files.map((file) => file.name).join(', ');

/**
 * Вычисляет процент
 * @param {number} value - Текущее значение
 * @param {number} total - Общее значение
 * @returns {number} Процент (0–100)
 */
export const calcPercent = (value, total) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

/**
 * Возвращает человекочитаемую метку статуса автотеста
 * @param {string} status - Ключ статуса
 * @returns {string} Локализованная метка
 */
export const getAutoTestStatusLabel = (status) => {
    if (status === 'success') return 'Успешно';
    if (status === 'failed') return 'Ошибка';
    if (status === 'skipped') return 'Пропущено';
    return status || '';
};

/**
 * Строит CSS conic-gradient для круговых диаграмм
 * @param {Array} segments - Массив объектов { value, color }
 * @param {number} total - Общее значение для расчёта процентов
 * @returns {string} Значение CSS conic-gradient
 */
export const buildConicGradient = (segments, total) => {
    if (!total) {
        return 'conic-gradient(from 120deg, rgba(148, 163, 184, 0.25), rgba(148, 163, 184, 0.05))';
    }

    let current = 0;
    const stops = segments.map((segment) => {
        const value = Math.max(0, segment.value || 0);
        const slice = (value / total) * 360;
        const start = current;
        const end = current + slice;
        current = end;
        return `${segment.color} ${start}deg ${end}deg`;
    });

    if (current < 360) {
        stops.push(`rgba(148, 163, 184, 0.2) ${current}deg 360deg`);
    }

    return `conic-gradient(${stops.join(', ')})`;
};
