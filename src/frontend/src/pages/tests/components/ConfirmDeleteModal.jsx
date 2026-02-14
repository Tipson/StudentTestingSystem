import React, {useEffect} from 'react';
import './ConfirmDeleteModal.css';

export default function ConfirmDeleteModal({
    isOpen,
    title,
    itemName,
    description,
    confirmText = 'Удалить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    loading = false,
}) {
    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onCancel?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const hasName = typeof itemName === 'string' && itemName.trim().length > 0;
    const fallbackDescription = hasName
        ? 'Вы уверены, что хотите удалить этот элемент?'
        : 'Вы уверены, что хотите удалить?';

    return (
        <div className="confirm-modal__backdrop" onClick={onCancel} role="presentation">
            <div className="confirm-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal>
                <div className="confirm-modal__header">
                    <h3>{title || 'Подтверждение удаления'}</h3>
                </div>
                <p className="confirm-modal__description">
                    {description || fallbackDescription}
                </p>
                {hasName && (
                    <div className="confirm-modal__item">{itemName}</div>
                )}
                <div className="confirm-modal__actions">
                    <button
                        type="button"
                        className="confirm-modal__button confirm-modal__button--ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className="confirm-modal__button confirm-modal__button--danger"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Удаляем...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
