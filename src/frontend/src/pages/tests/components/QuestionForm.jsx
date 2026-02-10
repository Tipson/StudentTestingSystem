import React from 'react';
import './QuestionForm.css';

const QUESTION_TYPES = [
    {value: 'single_choice', label: 'Один ответ'},
    {value: 'multiple_choice', label: 'Несколько ответов'},
    {value: 'text', label: 'Текстовый ответ'},
];

export default function QuestionForm({question, index, onChange, onSave, saving}) {
    const isChoice = question.type === 'single_choice' || question.type === 'multiple_choice';

    const handleOptionChange = (optIndex, field, value) => {
        const newOptions = [...(question.options || [])];
        newOptions[optIndex] = {...newOptions[optIndex], [field]: value};

        // For single_choice, uncheck others when one is selected
        if (field === 'isCorrect' && value && question.type === 'single_choice') {
            newOptions.forEach((opt, i) => {
                if (i !== optIndex) opt.isCorrect = false;
            });
        }

        onChange('options', newOptions);
    };

    const handleAddOption = () => {
        const newOptions = [...(question.options || []), {text: '', isCorrect: false}];
        onChange('options', newOptions);
    };

    const handleRemoveOption = (optIndex) => {
        const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
        onChange('options', newOptions);
    };

    return (
        <div className="question-form">
            <div className="form-section">
                <h2 className="form-section__title">Вопрос {index + 1}</h2>

                <div className="form-group">
                    <label className="form-group__label">Тип вопроса</label>
                    <select
                        className="form-input form-select"
                        value={question.type}
                        onChange={(e) => onChange('type', e.target.value)}
                    >
                        {QUESTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-group__label">Текст вопроса</label>
                    <textarea
                        className="form-input form-textarea"
                        placeholder="Введите текст вопроса"
                        rows={3}
                        value={question.text}
                        onChange={(e) => onChange('text', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-group__label">Баллы</label>
                    <input
                        type="number"
                        className="form-input"
                        min={1}
                        value={question.points || 1}
                        onChange={(e) => onChange('points', parseInt(e.target.value) || 1)}
                        style={{maxWidth: 120}}
                    />
                </div>
            </div>

            {isChoice && (
                <div className="form-section">
                    <div className="form-section__header">
                        <h2 className="form-section__title">Варианты ответов</h2>
                        <button className="btn btn--outline btn--sm" onClick={handleAddOption}>
                            + Добавить
                        </button>
                    </div>

                    <div className="options-list">
                        {(question.options || []).map((opt, optIndex) => (
                            <div key={optIndex} className="option-row">
                                <label className="option-row__check">
                                    <input
                                        type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                                        name={`correct-${index}`}
                                        checked={opt.isCorrect}
                                        onChange={(e) => handleOptionChange(optIndex, 'isCorrect', e.target.checked)}
                                    />
                                    <span className={`option-row__mark ${question.type === 'single_choice' ? 'option-row__mark--radio' : ''}`}/>
                                </label>
                                <input
                                    type="text"
                                    className="form-input option-row__input"
                                    placeholder={`Вариант ${optIndex + 1}`}
                                    value={opt.text}
                                    onChange={(e) => handleOptionChange(optIndex, 'text', e.target.value)}
                                />
                                {(question.options || []).length > 2 && (
                                    <button
                                        className="option-row__delete"
                                        onClick={() => handleRemoveOption(optIndex)}
                                        title="Удалить вариант"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="question-form__actions">
                <button
                    className="btn btn--primary"
                    onClick={onSave}
                    disabled={saving || !question.text.trim()}
                >
                    {saving ? 'Сохранение...' : 'Сохранить вопрос'}
                </button>
            </div>
        </div>
    );
}
