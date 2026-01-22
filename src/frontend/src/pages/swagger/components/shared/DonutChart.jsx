import React from 'react';

export default function DonutChart({
    gradient,
    centerValue,
    centerLabel,
    segments = [],
    className = '',
}) {
    return (
        <div className={`swagger-donut-chart ${className}`.trim()}>
            <div
                className="swagger-donut-ring"
                style={{background: gradient}}
            >
                <div className="swagger-donut-center">
                    <span className="swagger-donut-value">{centerValue}</span>
                    {centerLabel && (
                        <span className="swagger-donut-label">{centerLabel}</span>
                    )}
                </div>
            </div>
            {segments.length > 0 && (
                <div className="swagger-donut-legend">
                    {segments.map((segment) => (
                        <div key={segment.key} className="swagger-donut-legend-item">
                            <span
                                className="swagger-donut-legend-color"
                                style={{backgroundColor: segment.color}}
                            />
                            <span className="swagger-donut-legend-label">
                                {segment.label}: {segment.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
