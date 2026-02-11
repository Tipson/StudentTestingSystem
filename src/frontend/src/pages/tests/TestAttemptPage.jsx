import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import Layout from '@shared/components/Layout/Layout.jsx';
import {assessmentApi} from '@api/assessment.js';
import './TestAttemptPage.css';

const STATUS_AVAILABLE = new Set(['available', 'published', 'active', 'open']);

const resolveQuestionType = (question) => {
    const raw = question?.type;
    if (typeof raw === 'string') {
        const lower = raw.toLowerCase();
        if (lower.includes('multiple')) return 'multiple';
        if (lower.includes('single')) return 'single';
        if (lower.includes('text')) return 'text';
    }

    if (typeof raw === 'number') {
        if (raw === 1) return 'multiple';
        if (raw === 0) return 'single';
        if (raw === 2) {
            const hasOptionText = (question?.options || []).some((opt) => opt?.text?.trim());
            return hasOptionText ? 'single' : 'text';
        }
        if (raw >= 3) return 'text';
    }

    const hasOptions = Array.isArray(question?.options) && question.options.length > 0;
    return hasOptions ? 'single' : 'text';
};

const buildAnswerPayload = (question, answer) => {
    const type = resolveQuestionType(question);
    if (type === 'text') {
        return {
            optionId: null,
            optionIds: [],
            text: answer?.text || '',
        };
    }

    if (type === 'multiple') {
        const optionIds = Array.isArray(answer?.optionIds) ? answer.optionIds.filter(Boolean) : [];
        return {
            optionId: optionIds[0] || null,
            optionIds,
            text: '',
        };
    }

    const optionId = answer?.optionId || (Array.isArray(answer?.optionIds) ? answer.optionIds[0] : null) || null;
    return {
        optionId,
        optionIds: optionId ? [optionId] : [],
        text: '',
    };
};

const extractAnswers = (attempt) => {
    const raw = attempt?.answers || attempt?.responses || attempt?.answerRecords || attempt?.answerList || [];
    const list = Array.isArray(raw) ? raw : [];
    const map = {};

    list.forEach((item) => {
        const questionId = item?.questionId || item?.question?.id || item?.question?.questionId;
        if (!questionId) return;
        map[questionId] = {
            optionId: item?.optionId || item?.option?.id || null,
            optionIds: item?.optionIds || (Array.isArray(item?.options) ? item.options.map((opt) => opt?.id).filter(Boolean) : []),
            text: item?.text || item?.answerText || '',
        };
    });

    return map;
};

export default function TestAttemptPage() {
    const {testId, attemptId} = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [stage, setStage] = useState('intro');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingAnswer, setSavingAnswer] = useState(false);
    const [hints, setHints] = useState({});
    const [hintLoading, setHintLoading] = useState({});
    const [timeLeftSec, setTimeLeftSec] = useState(null);
    const [activeAttemptId, setActiveAttemptId] = useState(attemptId || null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [testRes, questionsRes] = await Promise.all([
                assessmentApi.tests.get(testId),
                assessmentApi.questions.list(testId),
            ]);

            const testData = testRes?.data ?? testRes;
            const questionList = questionsRes?.data || [];

            setTest(testData);
            setQuestions(questionList);

            const attemptKey = attemptId || activeAttemptId;
            if (attemptKey) {
                const attemptRes = await assessmentApi.attempts.get(attemptKey);
                const attemptData = attemptRes?.data ?? attemptRes;
                const attemptQuestions = attemptData?.questions || attemptData?.items || attemptData?.questionList;
                if (Array.isArray(attemptQuestions) && attemptQuestions.length > 0) {
                    setQuestions(attemptQuestions);
                }
                setAttempt(attemptData);
                setAnswers(extractAnswers(attemptData));
            }
        } catch (e) {
            console.error('Failed to load attempt:', e);
            setError('Не удалось загрузить тест. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    }, [attemptId, activeAttemptId, testId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (attemptId) {
            setActiveAttemptId(attemptId);
            setStage('question');
        }
    }, [attemptId]);

    const isPublished = useMemo(() => {
        if (!test) return false;
        const status = String(test.status || '').toLowerCase();
        if (STATUS_AVAILABLE.has(status)) return true;
        if (typeof test.isPublished === 'boolean') return test.isPublished;
        if (typeof test.published === 'boolean') return test.published;
        if (test.publishedAt) return true;
        return false;
    }, [test]);

    const durationMinutes = useMemo(() => {
        if (!test) return null;
        if (test.duration != null) return test.duration;
        if (test.timeLimitMinutes != null) return test.timeLimitMinutes;
        if (test.timeLimitSeconds != null) return Math.round(test.timeLimitSeconds / 60);
        return null;
    }, [test]);

    const timeLimitSeconds = useMemo(() => {
        if (!test) return null;
        if (test.timeLimitSeconds != null) return test.timeLimitSeconds;
        if (test.duration != null) return test.duration * 60;
        if (test.timeLimitMinutes != null) return test.timeLimitMinutes * 60;
        return null;
    }, [test]);

    const attemptsLeft = useMemo(() => {
        if (!test) return null;
        if (test.maxAttempts != null) return test.maxAttempts - (test.usedAttempts || 0);
        if (test.attemptsLimit != null) return test.attemptsLimit - (test.usedAttempts || 0);
        return null;
    }, [test]);

    const currentQuestion = questions[currentIndex] || null;
    const totalQuestions = questions.length;
    const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

    useEffect(() => {
        if (!activeAttemptId || !timeLimitSeconds) {
            setTimeLeftSec(null);
            return undefined;
        }

        const startRaw = attempt?.startedAt || attempt?.startTime || attempt?.started || attempt?.createdAt;
        const startMs = startRaw ? new Date(startRaw).getTime() : Date.now();
        const endMs = startMs + timeLimitSeconds * 1000;

        const tick = () => {
            const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
            setTimeLeftSec(remaining);
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [activeAttemptId, attempt, timeLimitSeconds]);

    const timeLeftLabel = useMemo(() => {
        if (timeLeftSec == null) return '';
        const mins = Math.floor(timeLeftSec / 60);
        const secs = timeLeftSec % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }, [timeLeftSec]);

    const handleSelectSingle = (question, option) => {
        if (!question?.id || !option) return;
        setAnswers((prev) => ({
            ...prev,
            [question.id]: {
                optionId: option.id,
                optionIds: option.id ? [option.id] : [],
                text: option.text || '',
            },
        }));
    };

    const handleToggleMulti = (question, option) => {
        if (!question?.id || !option) return;
        setAnswers((prev) => {
            const current = prev[question.id] || {optionIds: []};
            const ids = new Set(current.optionIds || []);
            if (ids.has(option.id)) {
                ids.delete(option.id);
            } else if (option.id) {
                ids.add(option.id);
            }
            return {
                ...prev,
                [question.id]: {
                    optionIds: Array.from(ids),
                    optionId: Array.from(ids)[0] || null,
                    text: '',
                },
            };
        });
    };

    const handleTextAnswer = (question, text) => {
        if (!question?.id) return;
        setAnswers((prev) => ({
            ...prev,
            [question.id]: {
                optionId: null,
                optionIds: [],
                text,
            },
        }));
    };

    const hasAnswerForQuestion = (question, answer) => {
        const type = resolveQuestionType(question);
        if (type === 'text') {
            return Boolean(answer?.text?.trim());
        }
        if (type === 'multiple') {
            return Array.isArray(answer?.optionIds) && answer.optionIds.length > 0;
        }
        return Boolean(answer?.optionId);
    };

    const saveCurrentAnswer = async () => {
        if (!activeAttemptId) return;
        if (!currentQuestion?.id) return;
        const answer = answers[currentQuestion.id];
        if (!hasAnswerForQuestion(currentQuestion, answer)) return;

        setSavingAnswer(true);
        try {
            const payload = buildAnswerPayload(currentQuestion, answer);
            await assessmentApi.attempts.saveAnswer(activeAttemptId, currentQuestion.id, payload);
        } catch (e) {
            console.error('Failed to save answer:', e);
        } finally {
            setSavingAnswer(false);
        }
    };

    const saveAllAnswers = async () => {
        if (!activeAttemptId) return;
        setSavingAnswer(true);
        try {
            for (const question of questions) {
                if (!question?.id) continue;
                const answer = answers[question.id];
                if (!hasAnswerForQuestion(question, answer)) continue;
                const payload = buildAnswerPayload(question, answer);
                await assessmentApi.attempts.saveAnswer(activeAttemptId, question.id, payload);
            }
            return true;
        } catch (e) {
            console.error('Failed to save answers:', e);
            return false;
        } finally {
            setSavingAnswer(false);
        }
    };

    const handleHint = async () => {
        if (!activeAttemptId || !currentQuestion?.id || !test?.allowAiHints) return;
        setHintLoading((prev) => ({...prev, [currentQuestion.id]: true}));
        try {
            const res = await assessmentApi.ai.hint(activeAttemptId, currentQuestion.id);
            const data = res?.data ?? res;
            const hintText = data?.hintText
                || data?.hint
                || data?.text
                || data?.message
                || data?.answer
                || (typeof data === 'string' ? data : 'Подсказка получена.');
            setHints((prev) => ({
                ...prev,
                [currentQuestion.id]: {
                    text: hintText,
                    level: data?.hintLevel,
                    used: data?.usedCount,
                    remaining: data?.remainingCount,
                },
            }));
        } catch (e) {
            console.error('Failed to load hint:', e);
        } finally {
            setHintLoading((prev) => ({...prev, [currentQuestion.id]: false}));
        }
    };

    const handleNext = async () => {
        if (!currentQuestion) return;

        if (currentIndex >= totalQuestions - 1) {
            try {
                const saved = await saveAllAnswers();
                if (!saved) return;
                await assessmentApi.attempts.submit(activeAttemptId);
            } catch (e) {
                console.error('Failed to submit attempt:', e);
            }
            navigate('/tests');
            return;
        }

        await saveCurrentAnswer();
        setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
    };

    const handlePrev = async () => {
        if (currentIndex === 0) {
            setStage('intro');
            return;
        }
        await saveCurrentAnswer();
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const handleStartAttempt = async () => {
        if (activeAttemptId) {
            setStage('question');
            return;
        }
        try {
            setSavingAnswer(true);
            const response = await assessmentApi.attempts.start(testId);
            const attemptData = response?.data ?? response;
            const newAttemptId = attemptData?.id || attemptData?.attemptId || attemptData;
            if (newAttemptId) {
                setActiveAttemptId(newAttemptId);
                setAttempt(attemptData);
                setAnswers(extractAnswers(attemptData));
                navigate(`/tests/${testId}/attempt/${newAttemptId}`, {replace: true});
                setStage('question');
            }
        } catch (e) {
            console.error('Failed to start attempt:', e);
        } finally {
            setSavingAnswer(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="attempt-loading">Загрузка...</div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="attempt-page">
                    <div className="attempt-card">
                        <h2 className="attempt-title">Ошибка</h2>
                        <p className="attempt-muted">{error}</p>
                        <button className="attempt-btn attempt-btn--primary" onClick={() => navigate('/tests')}>
                            Вернуться к тестам
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!isPublished) {
        return (
            <Layout>
                <div className="attempt-page">
                    <div className="attempt-card">
                        <div className="attempt-header">
                            <h2 className="attempt-title">{test?.title || test?.name || 'Тест'}</h2>
                            <span className="attempt-badge">Недоступен</span>
                        </div>
                        <p className="attempt-muted">Этот тест пока не опубликован или недоступен для прохождения.</p>
                        <button className="attempt-btn attempt-btn--primary" onClick={() => navigate('/tests')}>
                            Вернуться к тестам
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="attempt-page">
                <div className="attempt-card">
                    {stage === 'intro' && (
                        <>
                            <div className="attempt-header">
                                <h2 className="attempt-title">{test?.title || test?.name || 'Тест'}</h2>
                                <span className="attempt-badge">Доступен</span>
                            </div>
                            <p className="attempt-description">
                                {test?.description || 'Описание теста отсутствует.'}
                            </p>

                            <div className="attempt-info">
                                {test?.groupName && (
                                    <div className="attempt-row">
                                        <span>Группа:</span>
                                        <strong>{test.groupName}</strong>
                                    </div>
                                )}
                                {durationMinutes != null && (
                                    <div className="attempt-row">
                                        <span>Время прохождения:</span>
                                        <strong>{durationMinutes} мин</strong>
                                    </div>
                                )}
                                {attemptsLeft != null && (
                                    <div className="attempt-row">
                                        <span>Количество попыток:</span>
                                        <strong>{attemptsLeft}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="attempt-actions">
                                <button
                                    className="attempt-btn attempt-btn--primary"
                                    onClick={handleStartAttempt}
                                    disabled={totalQuestions === 0 || savingAnswer}
                                >
                                    Начать тест
                                </button>
                                <button
                                    className="attempt-btn attempt-btn--ghost"
                                    onClick={() => navigate('/tests')}
                                >
                                    Выйти из теста
                                </button>
                            </div>
                        </>
                    )}

                    {stage === 'question' && currentQuestion && (
                        <>
                            <div className="attempt-progress">
                                <div className="attempt-progress__meta">
                                    <span className="attempt-progress__label">{currentIndex + 1}/{totalQuestions}</span>
                                    {timeLeftLabel && (
                                        <span className="attempt-timer">⏱ {timeLeftLabel}</span>
                                    )}
                                </div>
                                <div className="attempt-progress__bar">
                                    <div className="attempt-progress__fill" style={{width: `${progress}%`}} />
                                </div>
                            </div>

                            <div className="attempt-question-row">
                                <h3 className="attempt-question">
                                    {currentQuestion.text || currentQuestion.title || 'Вопрос'}
                                </h3>
                                {test?.allowAiHints && (
                                    <button
                                        className="attempt-hint-btn"
                                        type="button"
                                        onClick={handleHint}
                                        disabled={hintLoading[currentQuestion.id]}
                                        title="Подсказка"
                                    >
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                            <path d="M9 18h6"/>
                                            <path d="M10 22h4"/>
                                            <path d="M12 2a7 7 0 0 0-4 12c.7.6 1 1.2 1 2h6c0-.8.3-1.4 1-2a7 7 0 0 0-4-12z"/>
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="attempt-body">
                                {resolveQuestionType(currentQuestion) !== 'text' && (
                                    <div className="attempt-options">
                                        {(currentQuestion.options || []).map((option, idx) => {
                                            const answer = answers[currentQuestion.id] || {};
                                            const isMultiple = resolveQuestionType(currentQuestion) === 'multiple';
                                            const checked = isMultiple
                                                ? (answer.optionIds || []).includes(option.id)
                                                : answer.optionId === option.id;
                                            return (
                                                <label
                                                    key={option.id || idx}
                                                    className={`attempt-option ${checked ? 'attempt-option--checked' : ''}`}
                                                >
                                                    <input
                                                        type={isMultiple ? 'checkbox' : 'radio'}
                                                        name={`question-${currentQuestion.id}`}
                                                        checked={checked}
                                                        onChange={() => {
                                                            if (isMultiple) {
                                                                handleToggleMulti(currentQuestion, option);
                                                            } else {
                                                                handleSelectSingle(currentQuestion, option);
                                                            }
                                                        }}
                                                    />
                                                    <span className="attempt-option__text">
                                                        {option.text || `Вариант ${idx + 1}`}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {resolveQuestionType(currentQuestion) === 'text' && (
                                    <textarea
                                        className="attempt-textarea"
                                        rows={4}
                                        placeholder="Введите ответ..."
                                        value={answers[currentQuestion.id]?.text || ''}
                                        onChange={(e) => handleTextAnswer(currentQuestion, e.target.value)}
                                    />
                                )}

                                {hints[currentQuestion.id] && (
                                    <div className="attempt-hint">
                                        <div>{hints[currentQuestion.id].text}</div>
                                        {(hints[currentQuestion.id].level != null
                                            || hints[currentQuestion.id].remaining != null
                                            || hints[currentQuestion.id].used != null) && (
                                            <div className="attempt-hint-meta">
                                                {hints[currentQuestion.id].used != null && (
                                                    <span>Использовано: {hints[currentQuestion.id].used}</span>
                                                )}
                                                {hints[currentQuestion.id].remaining != null && (
                                                    <span>Осталось: {hints[currentQuestion.id].remaining}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="attempt-navigation">
                                <button
                                    className="attempt-btn attempt-btn--ghost"
                                    onClick={handlePrev}
                                    disabled={savingAnswer}
                                >
                                    Назад
                                </button>
                                <button
                                    className="attempt-btn attempt-btn--primary"
                                    onClick={handleNext}
                                    disabled={savingAnswer}
                                >
                                    {currentIndex >= totalQuestions - 1 ? 'Завершить' : 'Далее'}
                                </button>
                            </div>
                        </>
                    )}

                    {stage === 'question' && !currentQuestion && (
                        <div className="attempt-empty">Вопросы не найдены.</div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
