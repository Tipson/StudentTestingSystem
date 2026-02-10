import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {assessmentApi} from '@api/assessment.js';
import Layout from '@shared/components/Layout/Layout.jsx';
import './TestCreatePage.css';

export default function TestEditPage() {
    const {testId} = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: '',
        description: '',
        accessType: 'public',
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTest = useCallback(async () => {
        setLoading(true);
        try {
            const res = await assessmentApi.tests.get(testId);
            const test = res.data;
            setForm({
                title: test.title || test.name || '',
                description: test.description || '',
                accessType: test.accessType || 'public',
            });
        } catch (e) {
            console.error('Failed to fetch test:', e);
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        fetchTest();
    }, [fetchTest]);

    const handleChange = (field, value) => {
        setForm(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        setSaving(true);
        try {
            await assessmentApi.tests.update(testId, {
                title: form.title.trim(),
                description: form.description.trim(),
            });
            navigate('/tests');
        } catch (e) {
            console.error('Failed to update test:', e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div style={{color: 'var(--color-text-secondary)', padding: '40px 0', textAlign: 'center'}}>
                    Загрузка...
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="test-create">
                <h1 className="test-create__page-title">Редактирование теста</h1>

                <form className="test-create__form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Основная информация</h2>

                        <div className="form-group">
                            <label className="form-group__label">Название</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Введите название теста"
                                value={form.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-group__label">Описание</label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Введите описание теста"
                                rows={5}
                                value={form.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-group__label">Тип теста</label>
                            <div className="radio-group">
                                <label className="radio">
                                    <input
                                        type="radio"
                                        name="accessType"
                                        value="public"
                                        checked={form.accessType === 'public'}
                                        onChange={() => handleChange('accessType', 'public')}
                                    />
                                    <span className="radio__mark"/>
                                    <span className="radio__label">Публичный</span>
                                </label>
                                <label className="radio">
                                    <input
                                        type="radio"
                                        name="accessType"
                                        value="private"
                                        checked={form.accessType === 'private'}
                                        onChange={() => handleChange('accessType', 'private')}
                                    />
                                    <span className="radio__mark"/>
                                    <span className="radio__label">Приватный</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="test-create__actions">
                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={saving || !form.title.trim()}
                        >
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                            type="button"
                            className="btn btn--outline"
                            onClick={() => navigate(`/tests/${testId}/questions`)}
                        >
                            Вопросы
                        </button>
                        <button
                            type="button"
                            className="btn btn--outline"
                            onClick={() => navigate('/tests')}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
