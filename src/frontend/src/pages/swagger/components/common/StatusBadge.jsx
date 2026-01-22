/**
 * Компонент статусного бейджа
 * Переиспользуемый компонент для отображения индикаторов статуса
 */
import React from 'react';
import { getAutoTestStatusLabel } from '../../utils/formatters.js';

/**
 * StatusBadge — отображает цветной бейдж статуса
 *
 * @param {Object} props
 * @param {string} props.status - Ключ статуса: 'success', 'failed', 'skipped', 'running', 'idle'
 * @param {string} props.label - Пользовательская подпись (переопределяет стандартную)
 * @param {string} props.size - Размер бейджа: 'sm', 'md' (по умолчанию: 'md')
 * @param {boolean} props.showIcon - Показывать ли иконку статуса (по умолчанию: false)
 */
export default function StatusBadge({
                                        status = 'idle',
                                        label = '',
                                        size = 'md',
                                        showIcon = false,
                                    }) {
    // Подпись, отображаемая в бейдже
    const displayLabel = label || getAutoTestStatusLabel(status);

    // Иконки для разных статусов
    const statusIcons = {
        success: '✓',
        failed: '✕',
        skipped: '−',
        running: '◯',
        idle: '○',
    };

    // CSS-классы размеров бейджа
    const sizeClasses = {
        sm: 'swagger-status-badge--sm',
        md: '',
    };

    return (
        <span
            className={`swagger-status-badge swagger-status-badge--${status} ${
                sizeClasses[size] || ''
            }`}
        >
            {showIcon && (
                <span className="swagger-status-badge-icon">
                    {statusIcons[status] || '○'}
                </span>
            )}
            {displayLabel}
        </span>
    );
}

/**
 * HttpStatusBadge — отображает HTTP-статус
 * с цветовой индикацией в зависимости от кода
 *
 * @param {Object} props
 * @param {number} props.status - HTTP-код ответа
 */
export function HttpStatusBadge({ status }) {
    if (!status) return null;

    let variant = 'info';
    if (status >= 200 && status < 300) variant = 'success';
    else if (status >= 400 && status < 500) variant = 'warning';
    else if (status >= 500) variant = 'error';

    return (
        <span className={`swagger-http-badge swagger-http-badge--${variant}`}>
            {status}
        </span>
    );
}

/**
 * MethodBadge — отображает HTTP-метод
 * с соответствующим цветом
 *
 * @param {Object} props
 * @param {string} props.method - HTTP-метод (GET, POST и т.д.)
 */
export function MethodBadge({ method }) {
    if (!method) return null;

    const methodLower = method.toLowerCase();

    return (
        <span
            className={`swagger-method-badge swagger-method-badge--${methodLower}`}
        >
            {method}
        </span>
    );
}
