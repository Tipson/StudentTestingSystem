import React from 'react';
import './StatusBadge.css';

const STATUS_MAP = {
    available: {label: 'Доступен', className: 'badge--available'},
    passed: {label: 'Пройден успешно', className: 'badge--passed', icon: '✓'},
    failed: {label: 'Не сдан', className: 'badge--failed', icon: '✕'},
    unavailable: {label: 'Недоступен', className: 'badge--unavailable'},
    draft: {label: 'Черновик', className: 'badge--draft'},
    published: {label: 'Опубликован', className: 'badge--available'},
};

export default function StatusBadge({status}) {
    const config = STATUS_MAP[status] || STATUS_MAP.unavailable;

    return (
        <span className={`badge ${config.className}`}>
            {config.icon && <span className="badge__icon">{config.icon}</span>}
            {config.label}
        </span>
    );
}
