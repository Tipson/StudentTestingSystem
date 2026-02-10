import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
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
        // local-only: uploaded media preview data
        _media: [],
        _optionMedia: [[], []],
    };
}

/* ─────────── helper: get download URL for media ─────────── */
function getMediaDownloadUrl(mediaId) {
    const base = API_BASE_URLS.media || '';
    return `${base}/api/files/${mediaId}`;
}

/* ═══════════════════════════════════════════════════════════ */
export default function TestCreatePage() {
    const navigate = useNavigate();
    const {testId: editTestId} = useParams(); // if editing existing test

    // ── Test-level state ──
    const [testMeta, setTestMeta] = useState({
        title: '',
        description: '',
        allowAiHints: false,
    });
    const [testId, setTestId] = useState(editTestId || null);
    const [testSaved, setTestSaved] = useState(!!editTestId);

    // ── Questions state ──
    const [questions, setQuestions] = useState([makeEmptyQuestion()]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [saving, setSaving] = useState(false);
    const [savingTest, setSavingTest] = useState(false);

    const fileInputRef = useRef(null);
    const [uploadingFor, setUploadingFor] = useState(null); // null | 'question' | optionIndex

    // ── Load existing test data when editing ──
    useEffect(() => {
        if (!editTestId) return;
        (async () => {
            try {
                const [testRes, questionsRes] = await Promise.all([
                    assessmentApi.tests.get(editTestId),
                    assessmentApi.questions.list(editTestId),
                ]);
                const t = testRes.data;
                setTestMeta({
                    title: t.title || t.name || '',
                    description: t.description || '',
                    allowAiHints: t.allowAiHints ?? false,
                });
                const fetched = questionsRes.data || [];
                if (fetched.length > 0) {
                    setQuestions(fetched.map(q => ({
                        ...q,
                        _isNew: false,
                        _media: (q.mediaIds || []).map(id => ({id, type: 'unknown', name: id})),
                        _optionMedia: (q.options || []).map(
                            opt => (opt.mediaIds || []).map(id => ({id, type: 'unknown', name: id})),
                        ),
                    })));
                }
            } catch (e) {
                console.error('Failed to load test:', e);
            }
        })();
    }, [editTestId]);

    const current = questions[activeIdx] || null;

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

    /* ═══════════════ SAVE TEST ═══════════════ */
    const handleSaveTest = async () => {
        if (!testMeta.title.trim()) return;
        setSavingTest(true);
        try {
            let currentId = testId;
            if (currentId) {
                await assessmentApi.tests.update(currentId, {
                    title: testMeta.title.trim(),
                    description: testMeta.description.trim(),
                    allowAiHints: testMeta.allowAiHints,
                });
            } else {
                const res = await assessmentApi.tests.create({
                    title: testMeta.title.trim(),
                    description: testMeta.description.trim(),
                    allowAiHints: testMeta.allowAiHints,
                });
                currentId = res.data?.id || res.data;
                setTestId(currentId);
            }
            setTestSaved(true);

            // now save all questions
            await saveAllQuestions(currentId);

            navigate('/tests');
        } catch (e) {
            console.error('Failed to save test:', e);
        } finally {
            setSavingTest(false);
        }
    };

    /* ═══════════════ SAVE ALL QUESTIONS ═══════════════ */
    const saveAllQuestions = async (tId) => {
        const currentTestId = tId || testId;
        if (!currentTestId) return;

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) continue;

            const payload = {
                text: q.text,
                type: q.type,
                isRequired: q.isRequired ?? true,
                points: q.points || 1,
                options: (q.options || []).map((opt, idx) => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    order: idx,
                    mediaIds: opt.mediaIds || [],
                })),
                mediaIds: q.mediaIds || [],
            };

            try {
                if (q._isNew || !q.id) {
                    const res = await assessmentApi.questions.create(currentTestId, payload);
                    setQuestions(prev => {
                        const copy = [...prev];
                        copy[i] = {...copy[i], ...res.data, _isNew: false};
                        return copy;
                    });
                } else {
                    await assessmentApi.questions.update(q.id, payload);
                }
            } catch (e) {
                console.error(`Failed to save question ${i + 1}:`, e);
            }
        }
    };

    /* ═══════════════ SAVE SINGLE QUESTION ═══════════════ */
    const handleSaveCurrentQuestion = async () => {
        if (!current || !current.text.trim()) return;
        if (!testId) {
            // create test first
            if (!testMeta.title.trim()) return;
            setSaving(true);
            try {
                const res = await assessmentApi.tests.create({
                    title: testMeta.title.trim(),
                    description: testMeta.description.trim(),
                    allowAiHints: testMeta.allowAiHints,
                });
                const newId = res.data?.id || res.data;
                setTestId(newId);
                setTestSaved(true);
                await saveQuestion(newId, activeIdx);
            } catch (e) {
                console.error('Failed to create test:', e);
            } finally {
                setSaving(false);
            }
            return;
        }
        setSaving(true);
        try {
            await saveQuestion(testId, activeIdx);
        } catch (e) {
            console.error('Failed to save question:', e);
        } finally {
            setSaving(false);
        }
    };

    const saveQuestion = async (tId, idx) => {
        const q = questions[idx];
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
            setQuestions(prev => {
                const copy = [...prev];
                copy[idx] = {...copy[idx], ...res.data, _isNew: false};
                return copy;
            });
        } else {
            await assessmentApi.questions.update(q.id, payload);
            setQuestions(prev => {
                const copy = [...prev];
                copy[idx] = {...copy[idx], _isNew: false};
                return copy;
            });
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
        // also extend _optionMedia
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
        // target: 'question' or number (option index)
        const formData = new FormData();
        formData.append('files', file);
        try {
            const res = await mediaApi.files.create(formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            const uploaded = res.data; // expect array or single object
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

    /* ═══════════════ NAVIGATION ═══════════════ */
    const goToQuestion = (idx) => { if (idx >= 0 && idx < questions.length) setActiveIdx(idx); };
    const progress = questions.length > 0 ? ((activeIdx + 1) / questions.length) * 100 : 0;
    const isChoice = current && (current.type === 0 || current.type === 1);

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <Layout>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ALL_ACCEPT}
                style={{display: 'none'}}
                onChange={onFileInputChange}
            />

            <div className="tc-page">
                {/* ── Header ── */}
                <div className="tc-header">
                    <h1 className="tc-header__title">
                        {editTestId ? 'Редактирование теста' : 'Новый тест'}
                    </h1>
                    <button
                        className="btn btn--primary tc-header__save"
                        onClick={handleSaveTest}
                        disabled={savingTest || !testMeta.title.trim()}
                    >
                        {savingTest ? 'Сохранение...' : 'Сохранить тест'}
                    </button>
                </div>

                {/* ── Test meta section ── */}
                <div className="tc-meta">
                    <div className="tc-meta__row">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Название теста"
                            value={testMeta.title}
                            onChange={(e) => handleMetaChange('title', e.target.value)}
                        />
                    </div>
                    <div className="tc-meta__row">
                        <textarea
                            className="form-input form-textarea form-textarea--sm"
                            placeholder="Описание теста"
                            rows={2}
                            value={testMeta.description}
                            onChange={(e) => handleMetaChange('description', e.target.value)}
                        />
                    </div>
                    <label className="tc-meta__checkbox">
                        <input
                            type="checkbox"
                            checked={testMeta.allowAiHints}
                            onChange={(e) => handleMetaChange('allowAiHints', e.target.checked)}
                        />
                        <span>Разрешить AI-подсказки</span>
                    </label>
                </div>

                {/* ── Body: sidebar + question card ── */}
                <div className="tc-body">
                    {/* Left sidebar with question list */}
                    <QuestionSidebar
                        questions={questions}
                        activeIndex={activeIdx}
                        onSelect={goToQuestion}
                        onAdd={handleAddQuestion}
                        onDelete={handleDeleteQuestion}
                    />

                    {/* Main question card */}
                    <div className="tc-main">
                        <div className="tc-card">
                            {/* Progress section */}
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
                                {/* Add media card */}
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

                            {/* Attach file button (text link) */}
                            <button className="tc-attach" onClick={() => triggerFileUpload('question')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                </svg>
                                Прикрепить файл
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── FAB: add question ── */}
                <button className="fab" onClick={handleAddQuestion} title="Добавить вопрос">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        </Layout>
    );
}

/* ═══════════════ Media Card Component (grid style) ═══════════════ */
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
