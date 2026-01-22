/**
 * Компонент строки результата теста
 * Переиспользуемый компонент для отображения результатов тестов/сценариев
 */
import React from 'react';
import StatusBadge, { HttpStatusBadge, MethodBadge } from './StatusBadge.jsx';
import { formatAutoTestResponse } from '../../utils/formatters.js';

/**
 * TestResultRow — отображает результат одного теста
 * с возможностью раскрытия деталей
 *
 * @param {Object} props
 * @param {Object} props.result - Объект результата теста
 * @param {boolean} props.expanded - Раскрыты ли детали
 * @param {Function} props.onToggle - Колбэк переключения раскрытия
 * @param {boolean} props.isActive - Является ли тест текущим выполняемым
 */
export default function TestResultRow({
                                          result,
                                          expanded = false,
                                          onToggle,
                                          isActive = false,
                                      }) {
    const {
        id,
        title,
        status,
        httpStatus,
        method,
        path,
        message,
        durationMs,
        responseData,
    } = result;

    // Есть ли данные для отображения в деталях
    const hasDetails = responseData != null || message;

    return (
        <div
            className={`swagger-result-row swagger-result-row--${status} ${
                isActive ? 'swagger-result-row--active' : ''
            }`}
        >
            <div
                className="swagger-result-row-header"
                onClick={() => hasDetails && onToggle?.()}
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
                onKeyDown={(e) => hasDetails && e.key === 'Enter' && onToggle?.()}
            >
                <div className="swagger-result-row-main">
                    {hasDetails && (
                        <span className="swagger-result-row-arrow">
                            {expanded ? '▼' : '▶'}
                        </span>
                    )}
                    <StatusBadge status={status} size="sm" />
                    {httpStatus && <HttpStatusBadge status={httpStatus} />}
                    {method && <MethodBadge method={method} />}
                    <span className="swagger-result-row-title">
                        {title || path || id}
                    </span>
                </div>
                <div className="swagger-result-row-meta">
                    {durationMs != null && (
                        <span className="swagger-result-row-duration">
                            {durationMs}ms
                        </span>
                    )}
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="swagger-result-row-details">
                    {message && (
                        <div className="swagger-result-row-message">
                            <strong>Сообщение:</strong> {message}
                        </div>
                    )}
                    {responseData != null && (
                        <div className="swagger-result-row-response">
                            <strong>Ответ:</strong>
                            <pre className="swagger-result-row-json">
                                {formatAutoTestResponse(responseData)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * TestResultGroup — группирует результаты тестов
 *
 * @param {Object} props
 * @param {string} props.title - Заголовок группы
 * @param {Array} props.results - Массив результатов
 * @param {Object} props.expandedRows - Карта раскрытых строк по ID
 * @param {Function} props.onToggleRow - Колбэк переключения строки
 * @param {number} props.activeIndex - Индекс текущего активного теста
 */
export function TestResultGroup({
                                    title,
                                    results = [],
                                    expandedRows = {},
                                    onToggleRow,
                                    activeIndex = -1,
                                }) {
    const [collapsed, setCollapsed] = React.useState(false);

    if (!results.length) return null;

    return (
        <div className="swagger-result-group">
            <div
                className="swagger-result-group-header"
                onClick={() => setCollapsed(!collapsed)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setCollapsed(!collapsed)}
            >
                <span className="swagger-result-group-arrow">
                    {collapsed ? '▶' : '▼'}
                </span>
                <span className="swagger-result-group-title">{title}</span>
                <span className="swagger-result-group-count">
                    ({results.length})
                </span>
            </div>

            {!collapsed && (
                <div className="swagger-result-group-content">
                    {results.map((result, index) => (
                        <TestResultRow
                            key={result.id || index}
                            result={result}
                            expanded={expandedRows[result.id || index]}
                            onToggle={() =>
                                onToggleRow?.(result.id || index)
                            }
                            isActive={index === activeIndex}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
