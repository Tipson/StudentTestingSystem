import React, {useCallback, useEffect, useRef, useState} from 'react';
import './notificationCenter.css';
import {notifyError, subscribeNotifications} from './notificationCenter.js';

const MAX_STACK = 5;

// Провайдер рисует всплывающие уведомления поверх приложения.
export default function NotificationProvider({children}) {
    const [items, setItems] = useState([]);
    const timersRef = useRef(new Map());

    const removeById = useCallback((id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));

        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const enqueue = useCallback((payload) => {
        if (!payload) return;

        setItems((prev) => {
            const next = [payload, ...prev];
            return next.slice(0, MAX_STACK);
        });

        if (payload.duration > 0) {
            const timer = setTimeout(() => removeById(payload.id), payload.duration);
            timersRef.current.set(payload.id, timer);
        }
    }, [removeById]);

    useEffect(() => {
        const unsubscribe = subscribeNotifications(enqueue);
        return () => {
            unsubscribe();
        };
    }, [enqueue]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timer) => clearTimeout(timer));
            timersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        // Глобальные ловушки ошибок браузера.
        const handleError = (event) => {
            notifyError(event?.error || event?.message);
        };

        const handleRejection = (event) => {
            notifyError(event?.reason || event);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return (
        <>
            {children}
            {items.length > 0 && (
                <div className="notification-center" role="status" aria-live="polite">
                    {items.map((item) => (
                        <div key={item.id} className={`notification-card notification-${item.type}`}>
                            <div className="notification-header">
                                {item.title && <strong className="notification-title">{item.title}</strong>}
                                <button
                                    type="button"
                                    className="notification-close"
                                    onClick={() => removeById(item.id)}
                                    aria-label="Закрыть уведомление"
                                >
                                    &times;
                                </button>
                            </div>
                            {item.message && <div className="notification-message">{item.message}</div>}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}