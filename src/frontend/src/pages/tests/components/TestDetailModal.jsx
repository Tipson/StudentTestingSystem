import React from 'react';
import StatusBadge from './StatusBadge.jsx';
import './TestDetailModal.css';

export default function TestDetailModal({test, onClose, onStart}) {
    const canStart = test.status === 'Published';

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal test-detail-modal">
                <div className="test-detail-modal__header">
                    <h2 className="test-detail-modal__title">{test.title || test.name}</h2>
                    <StatusBadge status={test.status}/>
                </div>

                <p className="test-detail-modal__description">
                    {test.description || 'Нет описания'}
                </p>

                <div className="test-detail-modal__info">
                    {test.groupName && (
                        <div className="test-detail-modal__row">
                            <span className="test-detail-modal__label">Группа:</span>
                            <span className="test-detail-modal__value">{test.groupName}</span>
                        </div>
                    )}
                    {test.duration != null && (
                        <div className="test-detail-modal__row">
                            <span className="test-detail-modal__label">Время прохождения:</span>
                            <span className="test-detail-modal__value">{test.duration} мин</span>
                        </div>
                    )}
                    {test.maxAttempts != null && (
                        <div className="test-detail-modal__row">
                            <span className="test-detail-modal__label">Количество попыток:</span>
                            <span className="test-detail-modal__value">
                                {test.maxAttempts - (test.usedAttempts || 0)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="test-detail-modal__actions">
                    {canStart && (
                        <button
                            className="btn btn--primary btn--block"
                            onClick={() => onStart(test.id)}
                        >
                            Начать тест
                        </button>
                    )}
                    <button
                        className="btn btn--outline btn--block"
                        onClick={onClose}
                    >
                        Выйти из теста
                    </button>
                </div>
            </div>
        </div>
    );
}
