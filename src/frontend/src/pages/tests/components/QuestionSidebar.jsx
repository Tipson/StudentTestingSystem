import React from 'react';
import './QuestionSidebar.css';

export default function QuestionSidebar({questions, activeIndex, onSelect, onAdd, onDelete}) {
    return (
        <aside className="q-sidebar">
            <div className="q-sidebar__header">
                <h3 className="q-sidebar__title">Вопросы</h3>
                <button className="q-sidebar__add" onClick={onAdd} title="Добавить вопрос">
                    +
                </button>
            </div>
            <div className="q-sidebar__list">
                {questions.map((q, index) => (
                    <div
                        key={q.id || `new-${index}`}
                        className={`q-sidebar__item ${index === activeIndex ? 'q-sidebar__item--active' : ''}`}
                        onClick={() => onSelect(index)}
                    >
                        <span className="q-sidebar__number">{index + 1}</span>
                        <span className="q-sidebar__text">
                            {q.text ? q.text.slice(0, 40) + (q.text.length > 40 ? '...' : '') : 'Новый вопрос'}
                        </span>
                        <button
                            className="q-sidebar__delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(index);
                            }}
                            title="Удалить вопрос"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </aside>
    );
}
