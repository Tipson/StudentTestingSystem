import React from 'react';
import {formatAutoTestResponse, getAutoTestStatusLabel} from '../../utils/index.js';

export default function TestResultRow({
    item,
    index,
    rowKey,
    expanded,
    onToggle,
    isActive = false,
}) {
    const statusLabel = getAutoTestStatusLabel(item.status);
    const hasResponse = item.responseData != null;

    return (
        <div
            className={`swagger-result-row swagger-result-${item.status} ${isActive ? 'swagger-result-active' : ''}`}
            data-index={index}
        >
            <div className="swagger-result-header" onClick={() => hasResponse && onToggle(rowKey)}>
                <span className="swagger-result-method">{item.method}</span>
                <span className="swagger-result-path">{item.path}</span>
                <span className="swagger-result-title">{item.title}</span>
                <span className="swagger-result-status">{statusLabel}</span>
                {item.httpStatus && (
                    <span className="swagger-result-http">HTTP {item.httpStatus}</span>
                )}
                {item.durationMs != null && (
                    <span className="swagger-result-duration">{item.durationMs} мс</span>
                )}
                {hasResponse && (
                    <span className="swagger-result-toggle">
                        {expanded ? '▲' : '▼'}
                    </span>
                )}
            </div>
            {item.message && (
                <div className="swagger-result-message">{item.message}</div>
            )}
            {expanded && hasResponse && (
                <pre className="swagger-result-response">
                    {formatAutoTestResponse(item.responseData)}
                </pre>
            )}
        </div>
    );
}
