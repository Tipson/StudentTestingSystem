/**
 * Компонент круговой диаграммы
 * Переиспользуемый компонент для отображения круговых диаграмм прогресса/статуса
 */
import React, { useMemo } from 'react';
import { buildConicGradient, calcPercent } from '../../utils/formatters.js';

/**
 * CircularChart — отображает круговую диаграмму
 * на основе conic-gradient с опциональной легендой
 *
 * @param {Object} props
 * @param {Array} props.segments - Массив сегментов { key, label, value, color }
 * @param {number} props.total - Общее значение для расчёта процентов
 * @param {string} props.title - Заголовок диаграммы
 * @param {number} props.centerValue - Значение в центре (процент)
 * @param {string} props.centerLabel - Подпись под центральным значением
 * @param {boolean} props.showLegend - Показывать ли легенду (по умолчанию: true)
 * @param {string} props.size - Размер диаграммы: 'sm', 'md', 'lg' (по умолчанию: 'md')
 */
export default function CircularChart({
                                          segments = [],
                                          total = 0,
                                          title = '',
                                          centerValue = null,
                                          centerLabel = '',
                                          showLegend = true,
                                          size = 'md',
                                      }) {
    // Генерация conic-gradient для диаграммы
    const gradient = useMemo(
        () => buildConicGradient(segments, total),
        [segments, total],
    );

    // Значение для отображения в центре диаграммы
    const displayValue = centerValue !== null
        ? centerValue
        : (total > 0 ? calcPercent(segments[0]?.value || 0, total) : 0);

    // CSS-классы размеров диаграммы
    const sizeClasses = {
        sm: 'swagger-chart-ring--sm',
        md: '',
        lg: 'swagger-chart-ring--lg',
    };

    return (
        <div className="swagger-chart-card">
            {title && <div className="swagger-chart-title">{title}</div>}
            <div className="swagger-chart-content">
                <div
                    className={`swagger-chart-ring ${sizeClasses[size] || ''}`}
                    style={{ background: gradient }}
                >
                    <div className="swagger-chart-center">
                        <span className="swagger-chart-value">{displayValue}%</span>
                        {centerLabel && (
                            <span className="swagger-chart-label">{centerLabel}</span>
                        )}
                    </div>
                </div>

                {/* Легенда диаграммы */}
                {showLegend && segments.length > 0 && (
                    <div className="swagger-chart-legend">
                        {segments.map((segment) => (
                            <div
                                key={segment.key}
                                className="swagger-chart-legend-item"
                            >
                                <span
                                    className="swagger-chart-legend-color"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="swagger-chart-legend-label">
                                    {segment.label}: {segment.value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
