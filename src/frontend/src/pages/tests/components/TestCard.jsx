import React from 'react';
import StatusBadge from './StatusBadge.jsx';
import './TestCard.css';

export default function TestCard({test, isTeacher, onClick, onContextMenu}) {
    const description = test.description || 'Нет описания';
    const truncated = description.length > 120
        ? description.slice(0, 120) + '...'
        : description;

    const attemptsLeft = test.attemptsLimit != null
        ? (test.attemptsLimit - (test.usedAttempts || 0))
        : null;

    return (
        <div className="test-card" onClick={onClick}>
            <div className="test-card__header">
                <h3 className="test-card__title">{test.title || test.name}</h3>
                <StatusBadge status={test.status} />
                {isTeacher && (
                    <button
                        className="test-card__menu-btn"
                        onClick={onContextMenu}
                        title="Действия"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="4"  cy="10" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="16" cy="10" r="1.5" />
                        </svg>

                    </button>
                )}
            </div>
            <p className="test-card__description">{truncated}</p>
            {attemptsLeft != null && (
                <p className="test-card__attempts">
                    Количество попыток: <span className="test-card__attempts-count">{attemptsLeft}</span>
                </p>
            )}
        </div>
    );
}
