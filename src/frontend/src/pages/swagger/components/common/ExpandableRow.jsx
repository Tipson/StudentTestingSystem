/**
 * Компонент разворачиваемой строки
 * Переиспользуемый компонент для таблиц с раскрывающимися строками
 */
import React from 'react';

/**
 * ExpandableRow — строка, которая может разворачиваться
 * и показывать дополнительный контент
 *
 * @param {Object} props
 * @param {boolean} props.expanded - Раскрыта ли строка
 * @param {Function} props.onToggle - Колбэк переключения состояния
 * @param {React.ReactNode} props.header - Заголовок строки (всегда видим)
 * @param {React.ReactNode} props.children - Раскрываемый контент
 * @param {string} props.className - Дополнительный CSS-класс
 */
export default function ExpandableRow({
                                          expanded = false,
                                          onToggle,
                                          header,
                                          children,
                                          className = '',
                                      }) {
    return (
        <div
            className={`swagger-expandable-row ${
                expanded ? 'swagger-expandable-row--expanded' : ''
            } ${className}`}
        >
            <div
                className="swagger-expandable-row-header"
                onClick={onToggle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onToggle?.()}
            >
                <span className="swagger-expandable-row-arrow">
                    {expanded ? '▼' : '▶'}
                </span>
                {header}
            </div>

            {expanded && children && (
                <div className="swagger-expandable-row-content">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * CollapsibleSection — секция с заголовком,
 * которая может сворачиваться и разворачиваться
 *
 * @param {Object} props
 * @param {string} props.title - Заголовок секции
 * @param {boolean} props.defaultExpanded - Начальное состояние (развёрнута/свёрнута)
 * @param {React.ReactNode} props.children - Содержимое секции
 * @param {React.ReactNode} props.badge - Необязательный бейдж рядом с заголовком
 */
export function CollapsibleSection({
                                       title,
                                       defaultExpanded = true,
                                       children,
                                       badge = null,
                                   }) {
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    return (
        <div
            className={`swagger-collapsible-section ${
                expanded ? 'swagger-collapsible-section--expanded' : ''
            }`}
        >
            <div
                className="swagger-collapsible-section-header"
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
            >
                <span className="swagger-collapsible-section-arrow">
                    {expanded ? '▼' : '▶'}
                </span>
                <span className="swagger-collapsible-section-title">
                    {title}
                </span>
                {badge}
            </div>

            {expanded && (
                <div className="swagger-collapsible-section-content">
                    {children}
                </div>
            )}
        </div>
    );
}
