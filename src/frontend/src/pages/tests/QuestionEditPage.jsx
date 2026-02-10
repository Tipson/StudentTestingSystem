import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {assessmentApi} from '@api/assessment.js';
import Layout from '@shared/components/Layout/Layout.jsx';
import QuestionSidebar from './components/QuestionSidebar.jsx';
import QuestionForm from './components/QuestionForm.jsx';
import ConfirmDeleteModal from './components/ConfirmDeleteModal.jsx';
import './QuestionEditPage.css';

const EMPTY_QUESTION = {
    text: '',
    type: 'single_choice',
    options: [
        {text: '', isCorrect: false},
        {text: '', isCorrect: false},
    ],
    points: 1,
};

export default function QuestionEditPage() {
    const {testId} = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [testRes, questionsRes] = await Promise.all([
                assessmentApi.tests.get(testId),
                assessmentApi.questions.list(testId),
            ]);
            setTest(testRes.data);
            const fetched = questionsRes.data || [];
            if (fetched.length === 0) {
                // Start with one empty question stub
                setQuestions([{...EMPTY_QUESTION, _isNew: true}]);
            } else {
                setQuestions(fetched.map(q => ({...q, _isNew: false})));
            }
        } catch (e) {
            console.error('Failed to fetch test data:', e);
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const currentQuestion = questions[activeIndex] || null;

    const handleUpdateQuestion = (field, value) => {
        setQuestions(prev => {
            const updated = [...prev];
            updated[activeIndex] = {...updated[activeIndex], [field]: value};
            return updated;
        });
    };

    const handleAddQuestion = () => {
        setQuestions(prev => [...prev, {...EMPTY_QUESTION, _isNew: true}]);
        setActiveIndex(questions.length);
    };

    const handleSaveQuestion = async () => {
        if (!currentQuestion) return;
        setSaving(true);
        try {
            const payload = {
                text: currentQuestion.text,
                type: currentQuestion.type,
                options: currentQuestion.options,
                points: currentQuestion.points,
            };

            if (currentQuestion._isNew) {
                const res = await assessmentApi.questions.create(testId, payload);
                setQuestions(prev => {
                    const updated = [...prev];
                    updated[activeIndex] = {...res.data, _isNew: false};
                    return updated;
                });
            } else {
                await assessmentApi.questions.update(currentQuestion.id, payload);
                setQuestions(prev => {
                    const updated = [...prev];
                    updated[activeIndex] = {...updated[activeIndex], _isNew: false};
                    return updated;
                });
            }
        } catch (e) {
            console.error('Failed to save question:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = (index) => {
        const question = questions[index];
        if (!question) return;
        setDeleteTarget({index, question});
    };

    const handleConfirmDeleteQuestion = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.question?.id;
        const targetIndex = targetId
            ? questions.findIndex((q) => q.id === targetId)
            : deleteTarget.index;

        if (targetIndex < 0) {
            setDeleteTarget(null);
            return;
        }

        const target = questions[targetIndex];

        if (!target._isNew && target.id) {
            setDeleteLoading(true);
            try {
                await assessmentApi.questions.remove(target.id);
            } catch (e) {
                console.error('Failed to delete question:', e);
                setDeleteLoading(false);
                return;
            }
        }

        const updated = questions.filter((_, i) => i !== targetIndex);
        if (updated.length === 0) {
            setQuestions([{...EMPTY_QUESTION, _isNew: true}]);
            setActiveIndex(0);
        } else {
            setQuestions(updated);
            setActiveIndex((prev) => Math.min(prev, updated.length - 1));
        }

        setDeleteLoading(false);
        setDeleteTarget(null);
    };

    const handleBack = () => {
        navigate('/tests');
    };

    const deleteLabel = deleteTarget
        ? (deleteTarget.question?.text
            ? deleteTarget.question.text
            : `Вопрос №${deleteTarget.index + 1}`)
        : '';

    if (loading) {
        return (
            <Layout>
                <div className="question-edit__loading">Загрузка...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="question-edit">
                <div className="question-edit__header">
                    <button className="btn btn--outline btn--sm" onClick={handleBack}>
                        ← Назад к тестам
                    </button>
                    <h1 className="question-edit__title">
                        {test?.title || test?.name || 'Вопросы теста'}
                    </h1>
                </div>

                <div className="question-edit__body">
                    <QuestionSidebar
                        questions={questions}
                        activeIndex={activeIndex}
                        onSelect={setActiveIndex}
                        onAdd={handleAddQuestion}
                        onDelete={handleDeleteQuestion}
                    />

                    <div className="question-edit__main">
                        {currentQuestion && (
                            <QuestionForm
                                question={currentQuestion}
                                index={activeIndex}
                                onChange={handleUpdateQuestion}
                                onSave={handleSaveQuestion}
                                saving={saving}
                            />
                        )}
                    </div>
                </div>

                <ConfirmDeleteModal
                    isOpen={Boolean(deleteTarget)}
                    title="Удалить вопрос"
                    itemName={deleteLabel}
                    description="Действие нельзя отменить. Вопрос будет удалён из теста."
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleConfirmDeleteQuestion}
                    loading={deleteLoading}
                />
            </div>
        </Layout>
    );
}
