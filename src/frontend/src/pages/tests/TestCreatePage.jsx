import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {assessmentApi} from '@api/assessment.js';
import {mediaApi} from '@api/media.js';
import {API_BASE_URLS} from '@api/config.js';
import Layout from '@shared/components/Layout/Layout.jsx';
import QuestionSidebar from './components/QuestionSidebar.jsx';
import './TestCreatePage.css';

// type в API — число: 0 = single, 1 = multiple, 2 = text
const QUESTION_TYPES = [
    {value: 0, label: 'Один правильный ответ'},
    {value: 1, label: 'Несколько правильных ответов'},
    {value: 2, label: 'Свой вариант ответа'},
];

const IMAGE_MIMES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/bmp', 'image/tiff',
]);
const VIDEO_MIMES = new Set([
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
    'video/webm', 'video/ogg', 'video/3gpp', 'video/3gpp2', 'video/x-matroska',
]);
const ARCHIVE_MIMES = new Set([
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'application/gzip', 'application/x-tar',
]);
const ALL_ACCEPT = [
    ...IMAGE_MIMES, ...VIDEO_MIMES, ...ARCHIVE_MIMES,
].join(',');

function isImageMime(mime) { return IMAGE_MIMES.has(mime); }
function isVideoMime(mime) { return VIDEO_MIMES.has(mime); }

function makeEmptyOption(order) {
    return {text: '', isCorrect: false, order, mediaIds: []};
}
function makeEmptyQuestion() {
    return {
        text: '',
        type: 0,
        isRequired: true,
        points: 1,
        options: [makeEmptyOption(0), makeEmptyOption(1)],
        mediaIds: [],
        _isNew: true,
        _media: [],
        _optionMedia: [[], []],
    };
}

function getMediaDownloadUrl(mediaId) {
    const base = API_BASE_URLS.media || '';
    return `${base}/api/files/${mediaId}`;
}

/* ═══════════════════════════════════════════════════════════ */
export default function TestCreatePage() {
    const navigate = useNavigate();

    // ── Step state: 1 = basic info, 2 = questions, 3 = settings + publish ──
    const [step, setStep] = useState(1);

    // ── Test-level state ──
    const [testMeta, setTestMeta] = useState({
        title: '',
        description: '',
        accessType: 'public',
    });
    const [testId, setTestId] = useState(null);
    const [savingTest, setSavingTest] = useState(false);

    // ── Questions state ──
    const [questions, setQuestions] = useState([makeEmptyQuestion()]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [saving, setSaving] = useState(false);
    const questionsRef = useRef(questions);

    // ── Step 3: settings ──
    const [settings, setSettings] = useState({
        timeLimitMinutes: '',
        passScore: '',
        attemptsLimit: '',
        allowAiHints: false,
    });

    const fileInputRef = useRef(null);
    const [uploadingFor, setUploadingFor] = useState(null);

    const current = questions[activeIdx] || null;

    useEffect(() => {
        questionsRef.current = questions;
    }, [questions]);

    // ── Update a field on the current question ──
    const updateQ = useCallback((field, value) => {
        setQuestions(prev => {
            const copy = [...prev];
            copy[activeIdx] = {...copy[activeIdx], [field]: value};
            return copy;
        });
    }, [activeIdx]);

    // ── Test meta changes ──
    const handleMetaChange = (field, value) => {
        setTestMeta(prev => ({...prev, [field]: value}));
    };

    // ── Settings changes ──
    const handleSettingsChange = (field, value) => {
        setSettings(prev => ({...prev, [field]: value}));
    };

    /* ═══════════════ STEP 1 → STEP 2 ═══════════════ */
    const handleNextStep = async (e) => {
        e.preventDefault();
        if (!testMeta.title.trim()) return;

        setSavingTest(true);
        try {
            const res = await assessmentApi.tests.create({
                title: testMeta.title.trim(),
                description: testMeta.description.trim(),
            });
            const newId = res.data?.id || res.data;
            setTestId(newId);

            // Set access type
            if (testMeta.accessType !== 'public') {
                await assessmentApi.tests.updateAccessType(newId, testMeta.accessType);
            }

            setStep(2);
        } catch (e) {
            console.error('Failed to create test:', e);
        } finally {
            setSavingTest(false);
        }
    };

    /* ═══════════════ SAVE SINGLE QUESTION ═══════════════ */
    const saveQuestion = useCallback(async (tId, idx) => {
        const source = questionsRef.current;
        const q = source[idx];
        if (!q || !q.text.trim()) return;

        const payload = {
            text: q.text,
            type: q.type,
            isRequired: q.isRequired ?? true,
            points: q.points || 1,
            options: (q.options || []).map((opt, i) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: i,
                mediaIds: opt.mediaIds || [],
            })),
            mediaIds: q.mediaIds || [],
        };

        if (q._isNew || !q.id) {
            const res = await assessmentApi.questions.create(tId, payload);
            const updated = {...q, ...res.data, _isNew: false};
            const next = [...questionsRef.current];
            next[idx] = updated;
            questionsRef.current = next;
            setQuestions(next);
        } else {
            await assessmentApi.questions.update(q.id, payload);
            const updated = {...q, _isNew: false};
            const next = [...questionsRef.current];
            next[idx] = updated;
            questionsRef.current = next;
            setQuestions(next);
        }
    }, []);

    /* ═══════════════ AUTO-SAVE ON QUESTION NAVIGATION ═══════════════ */
    const goToQuestion = useCallback(async (idx) => {
        if (idx < 0 || idx >= questions.length || idx === activeIdx) return;

        // Save current question before switching
        if (testId && current && current.text.trim()) {
            setSaving(true);
            try {
                await saveQuestion(testId, activeIdx);
            } catch (e) {
                console.error('Auto-save failed:', e);
            } finally {
                setSaving(false);
            }
        }

        setActiveIdx(idx);
    }, [activeIdx, current, questions, testId, saveQuestion]);

    /* ═══════════════ STEP 2 → STEP 3: Save all questions ═══════════════ */
    const handleGoToSettings = async () => {
        if (!testId) return;

        setSavingTest(true);
        try {
            // Save current question first
            if (current && current.text.trim()) {
                await saveQuestion(testId, activeIdx);
            }

            // Save all unsaved questions
            for (let i = 0; i < questionsRef.current.length; i++) {
                if (i === activeIdx) continue;
                const q = questionsRef.current[i];
                if (!q.text.trim()) continue;
                if (q._isNew || !q.id) {
                    await saveQuestion(testId, i);
                }
            }

            setStep(3);
        } catch (e) {
            console.error('Failed to save questions:', e);
        } finally {
            setSavingTest(false);
        }
    };

    /* ═══════════════ STEP 3: Publish ═══════════════ */
    const handlePublish = async (e) => {
        e.preventDefault();
        if (!testId) return;

        setSavingTest(true);
        try {
            // Update test settings
            const timeLimitSeconds = settings.timeLimitMinutes
                ? parseInt(settings.timeLimitMinutes) * 60
                : 0;

            await assessmentApi.tests.update(testId, {
                title: testMeta.title.trim(),
                description: testMeta.description.trim(),
                passScore: parseInt(settings.passScore) || 0,
                attemptsLimit: parseInt(settings.attemptsLimit) || 0,
                timeLimitSeconds,
                allowAiHints: settings.allowAiHints,
            });

            // Publish test
            await assessmentApi.tests.publish(testId);

            navigate('/tests');
        } catch (e) {
            console.error('Failed to publish test:', e);
        } finally {
            setSavingTest(false);
        }
    };

    /* ═══════════════ ADD / DELETE QUESTIONS ═══════════════ */
    const handleAddQuestion = () => {
        setQuestions(prev => [...prev, makeEmptyQuestion()]);
        setActiveIdx(questions.length);
    };

    const handleDeleteQuestion = async (idx) => {
        const q = questions[idx];
        if (q && !q._isNew && q.id) {
            try { await assessmentApi.questions.remove(q.id); } catch (e) { /* ignore */ }
        }
        setQuestions(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            return updated.length === 0 ? [makeEmptyQuestion()] : updated;
        });
        setActiveIdx(prev => Math.min(prev, Math.max(0, questions.length - 2)));
    };

    /* ═══════════════ OPTION HELPERS ═══════════════ */
    const handleOptionChange = (optIdx, field, value) => {
        const newOptions = [...(current.options || [])];
        newOptions[optIdx] = {...newOptions[optIdx], [field]: value};
        if (field === 'isCorrect' && value && current.type === 0) {
            newOptions.forEach((opt, i) => { if (i !== optIdx) opt.isCorrect = false; });
        }
        updateQ('options', newOptions);
    };

    const handleAddOption = () => {
        const opts = [...(current.options || []), makeEmptyOption((current.options || []).length)];
        updateQ('options', opts);
        setQuestions(prev => {
            const copy = [...prev];
            copy[activeIdx] = {
                ...copy[activeIdx],
                _optionMedia: [...(copy[activeIdx]._optionMedia || []), []],
            };
            return copy;
        });
    };

    const handleRemoveOption = (optIdx) => {
        updateQ('options', (current.options || []).filter((_, i) => i !== optIdx));
        setQuestions(prev => {
            const copy = [...prev];
            copy[activeIdx] = {
                ...copy[activeIdx],
                _optionMedia: (copy[activeIdx]._optionMedia || []).filter((_, i) => i !== optIdx),
            };
            return copy;
        });
    };

    /* ═══════════════ FILE UPLOAD ═══════════════ */
    const handleUploadFile = async (file, target) => {
        const formData = new FormData();
        formData.append('files', file);
        try {
            const res = await mediaApi.files.create(formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            const uploaded = res.data;
            const items = Array.isArray(uploaded) ? uploaded : [uploaded];

            items.forEach(item => {
                const mediaId = item.id || item;
                const mime = item.mimeType || item.contentType || file.type || '';
                const preview = {
                    id: mediaId,
                    name: file.name,
                    mime,
                    url: isImageMime(mime) ? getMediaDownloadUrl(mediaId) : null,
                };

                if (target === 'question') {
                    setQuestions(prev => {
                        const copy = [...prev];
                        const q = {...copy[activeIdx]};
                        q.mediaIds = [...(q.mediaIds || []), mediaId];
                        q._media = [...(q._media || []), preview];
                        copy[activeIdx] = q;
                        return copy;
                    });
                } else {
                    const optIdx = target;
                    setQuestions(prev => {
                        const copy = [...prev];
                        const q = {...copy[activeIdx]};
                        const opts = [...(q.options || [])];
                        opts[optIdx] = {
                            ...opts[optIdx],
                            mediaIds: [...(opts[optIdx].mediaIds || []), mediaId],
                        };
                        q.options = opts;
                        const optMedia = [...(q._optionMedia || [])];
                        optMedia[optIdx] = [...(optMedia[optIdx] || []), preview];
                        q._optionMedia = optMedia;
                        copy[activeIdx] = q;
                        return copy;
                    });
                }
            });
        } catch (e) {
            console.error('Upload failed:', e);
        }
    };

    const onFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        handleUploadFile(file, uploadingFor);
        e.target.value = '';
    };

    const triggerFileUpload = (target) => {
        setUploadingFor(target);
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const removeMedia = (target, mediaId) => {
        if (target === 'question') {
            setQuestions(prev => {
                const copy = [...prev];
                const q = {...copy[activeIdx]};
                q.mediaIds = (q.mediaIds || []).filter(id => id !== mediaId);
                q._media = (q._media || []).filter(m => m.id !== mediaId);
                copy[activeIdx] = q;
                return copy;
            });
        } else {
            const optIdx = target;
            setQuestions(prev => {
                const copy = [...prev];
                const q = {...copy[activeIdx]};
                const opts = [...(q.options || [])];
                opts[optIdx] = {
                    ...opts[optIdx],
                    mediaIds: (opts[optIdx].mediaIds || []).filter(id => id !== mediaId),
                };
                q.options = opts;
                const optMedia = [...(q._optionMedia || [])];
                optMedia[optIdx] = (optMedia[optIdx] || []).filter(m => m.id !== mediaId);
                q._optionMedia = optMedia;
                copy[activeIdx] = q;
                return copy;
            });
        }
    };

    const progress = questions.length > 0 ? ((activeIdx + 1) / questions.length) * 100 : 0;
    const isChoice = current && (current.type === 0 || current.type === 1);
    const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    /* ═══════════════ RENDER ═══════════════ */

    // ── STEP 1: Basic test info ──
    if (step === 1) {
        return (
            <Layout>
                <div className="test-create">
                    <h1 className="test-create__page-title">Новый тест</h1>

                    <form className="test-create__form" onSubmit={handleNextStep}>
                        <div className="form-section">
                            <h2 className="form-section__title">Основная информация</h2>

                            <div className="form-group">
                                <label className="form-group__label">Название</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Введите название теста"
                                    value={testMeta.title}
                                    onChange={(e) => handleMetaChange('title', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-group__label">Описание</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Введите описание теста"
                                    rows={5}
                                    value={testMeta.description}
                                    onChange={(e) => handleMetaChange('description', e.target.value)}
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
                                            checked={testMeta.accessType === 'public'}
                                            onChange={() => handleMetaChange('accessType', 'public')}
                                        />
                                        <span className="radio__mark"/>
                                        <span className="radio__label">Публичный</span>
                                    </label>
                                    <label className="radio">
                                        <input
                                            type="radio"
                                            name="accessType"
                                            value="private"
                                            checked={testMeta.accessType === 'private'}
                                            onChange={() => handleMetaChange('accessType', 'private')}
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
                                disabled={savingTest || !testMeta.title.trim()}
                            >
                                {savingTest ? 'Создание...' : 'Далее'}
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

    // ── STEP 3: Settings + Publish ──
    if (step === 3) {
        return (
            <Layout>
                <div className="test-create">
                    <h1 className="test-create__page-title">Настройки теста</h1>

                    <form className="test-create__form" onSubmit={handlePublish}>
                        {/* Score info banner */}
                        <div className="tc-score-info">
                            <div className="tc-score-info__icon">★</div>
                            <div className="tc-score-info__text">
                                Для успешного прохождения необходимо набрать{' '}
                                <span className="tc-score-info__value">
                                    {parseInt(settings.passScore) || 0}
                                </span>{' '}
                                из{' '}
                                <span className="tc-score-info__value">{maxScore}</span>{' '}
                                баллов
                            </div>
                        </div>

                        <div className="form-section">
                            <h2 className="form-section__title">Параметры прохождения</h2>

                            <div className="form-group">
                                <label className="form-group__label">Ограничение по времени (минуты)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Без ограничения"
                                    min={0}
                                    value={settings.timeLimitMinutes}
                                    onChange={(e) => handleSettingsChange('timeLimitMinutes', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-group__label">
                                    Проходной балл
                                    <span style={{color: 'var(--color-text-muted)', fontWeight: 400}}>
                                        {' '}(макс. {maxScore})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0"
                                    min={0}
                                    max={maxScore}
                                    value={settings.passScore}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        handleSettingsChange('passScore', val > maxScore ? String(maxScore) : e.target.value);
                                    }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-group__label">Количество попыток</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Без ограничения"
                                    min={0}
                                    value={settings.attemptsLimit}
                                    onChange={(e) => handleSettingsChange('attemptsLimit', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="tc-meta__checkbox">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowAiHints}
                                        onChange={(e) => handleSettingsChange('allowAiHints', e.target.checked)}
                                    />
                                    Разрешить ИИ подсказки
                                </label>
                            </div>
                        </div>

                        <div className="test-create__actions">
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={savingTest}
                            >
                                {savingTest ? 'Публикация...' : 'Опубликовать тест'}
                            </button>
                            <button
                                type="button"
                                className="btn btn--outline"
                                onClick={() => setStep(2)}
                            >
                                Назад
                            </button>
                        </div>
                    </form>
                </div>
            </Layout>
        );
    }

    // ── STEP 2: Questions editor ──
    return (
        <Layout>
            <input
                ref={fileInputRef}
                type="file"
                accept={ALL_ACCEPT}
                style={{display: 'none'}}
                onChange={onFileInputChange}
            />

            <div className="tc-page">
                {/* Header: test title + save button */}
                <div className="tc-header">
                    <h1 className="tc-header__title">{testMeta.title || 'Новый тест'}</h1>
                    <button
                        className="btn btn--primary tc-header__save"
                        onClick={handleGoToSettings}
                        disabled={savingTest || saving}
                    >
                        {savingTest ? 'Сохранение...' : 'Сохранить тест'}
                    </button>
                </div>

                {/* Body: sidebar + main (80%) + add button */}
                <div className="tc-body">
                    <QuestionSidebar
                        questions={questions}
                        activeIndex={activeIdx}
                        onSelect={goToQuestion}
                        onAdd={handleAddQuestion}
                        onDelete={handleDeleteQuestion}
                    />

                    <div className="tc-main">
                        <div className="tc-card">
                            {/* Progress */}
                            <div className="tc-progress">
                                <span className="tc-progress__label">{activeIdx + 1}/{questions.length}</span>
                                <div className="tc-progress__bar">
                                    <div className="tc-progress__fill" style={{width: `${progress}%`}}/>
                                </div>
                            </div>

                            {/* Question text */}
                            <div className="tc-field">
                                <label className="tc-field__label">Вопрос</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Введите вопрос"
                                    rows={3}
                                    value={current?.text || ''}
                                    onChange={(e) => updateQ('text', e.target.value)}
                                />
                            </div>

                            {/* Question type */}
                            <div className="tc-field">
                                <label className="tc-field__label">Выберите формат ответов</label>
                                <div className="radio-group">
                                    {QUESTION_TYPES.map(t => (
                                        <label className="radio" key={t.value}>
                                            <input
                                                type="radio"
                                                name="qtype"
                                                checked={current?.type === t.value}
                                                onChange={() => updateQ('type', t.value)}
                                            />
                                            <span className="radio__mark"/>
                                            <span className="radio__label">{t.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Options (for choice types) */}
                            {isChoice && (
                                <div className="tc-field">
                                    <label className="tc-field__label">
                                        Добавьте варианты ответа и{' '}
                                        <span className="tc-field__accent">выберите правильный</span>
                                    </label>

                                    <div className="tc-options">
                                        {(current.options || []).map((opt, optIdx) => (
                                            <div key={optIdx} className="tc-option">
                                                <label className="tc-option__check">
                                                    <input
                                                        type={current.type === 0 ? 'radio' : 'checkbox'}
                                                        name={`opt-${activeIdx}`}
                                                        checked={opt.isCorrect}
                                                        onChange={(e) => handleOptionChange(optIdx, 'isCorrect', e.target.checked)}
                                                    />
                                                    <span className={`tc-option__mark ${current.type === 0 ? 'tc-option__mark--radio' : ''}`}/>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-input tc-option__input"
                                                    placeholder="Введите ответ"
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionChange(optIdx, 'text', e.target.value)}
                                                />
                                                <button
                                                    className="tc-option__remove"
                                                    onClick={() => handleRemoveOption(optIdx)}
                                                    title="Удалить вариант"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                                        <circle cx="9" cy="9" r="9" fill="var(--color-danger)"/>
                                                        <path d="M6 6l6 6M12 6l-6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}

                                        <button className="tc-add-option" onClick={handleAddOption}>
                                            <span className="tc-add-option__icon">+</span>
                                            Новый вариант
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Points */}
                            <div className="tc-field tc-field--inline">
                                <label className="tc-field__label">Баллы</label>
                                <input
                                    type="number"
                                    className="form-input tc-field__points"
                                    min={1}
                                    value={current?.points || 1}
                                    onChange={(e) => updateQ('points', parseInt(e.target.value) || 1)}
                                />
                            </div>

                            {/* Media grid */}
                            <div className="tc-media-grid">
                                {(current?._media || []).map(m => (
                                    <MediaCard
                                        key={m.id}
                                        media={m}
                                        onRemove={() => removeMedia('question', m.id)}
                                    />
                                ))}
                                <button
                                    className="tc-media-grid__add"
                                    onClick={() => triggerFileUpload('question')}
                                    title="Прикрепить файл"
                                >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add question button — справа по центру */}
                    <div className="tc-aside">
                        <button
                            className="tc-aside__add"
                            onClick={handleAddQuestion}
                            title="Добавить вопрос"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

/* ═══════════════ Media Card Component ═══════════════ */
function MediaCard({media, onRemove}) {
    const isImage = media.url || isImageMime(media.mime);
    const isVideo = isVideoMime(media.mime);

    return (
        <div className="tc-media-card">
            <button className="tc-media-card__remove" onClick={onRemove} title="Удалить">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            </button>
            {isImage && media.url ? (
                <img src={media.url} alt={media.name} className="tc-media-card__img"/>
            ) : isVideo ? (
                <div className="tc-media-card__icon tc-media-card__icon--video">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </div>
            ) : (
                <div className="tc-media-card__icon tc-media-card__icon--file">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </div>
            )}
            <span className="tc-media-card__name">{media.name}</span>
        </div>
    );
}
