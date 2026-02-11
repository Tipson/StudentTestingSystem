import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useUser} from '@shared/auth/UserProvider.jsx';
import {assessmentApi} from '@api/assessment.js';
import Layout from '@shared/components/Layout/Layout.jsx';
import TestCard from './components/TestCard.jsx';
import TestDetailModal from './components/TestDetailModal.jsx';
import ConfirmDeleteModal from './components/ConfirmDeleteModal.jsx';
import './TestListPage.css';

const TEACHER_ROLES_SET = new Set(['teacher', 'admin']);

function hasTeacherRole(roles = []) {
    return roles.some(r => TEACHER_ROLES_SET.has(String(r).toLowerCase()));
}

export default function TestListPage() {
    const navigate = useNavigate();
    const {roles} = useUser();
    const isTeacher = hasTeacherRole(roles);

    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedTest, setSelectedTest] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // pagination
    const [page, setPage] = useState(1);
    const pageSize = 48;

    const totalPages = Math.max(1, Math.ceil(tests.length / pageSize));

    const pageTests = useMemo(() => {
        const start = (page - 1) * pageSize;
        return tests.slice(start, start + pageSize);
    }, [tests, page, pageSize]);

    const fetchTests = useCallback(async () => {
        setLoading(true);
        try {
            const response = isTeacher
                ? await assessmentApi.tests.getMy()
                : await assessmentApi.tests.getAll();

            const items = response.data || [];
            setTests(items);

            // если текущая страница стала "вне диапазона" (например после удаления) — подвинем
            const nextTotalPages = Math.max(1, Math.ceil(items.length / pageSize));
            setPage(p => Math.min(p, nextTotalPages));
        } catch (e) {
            console.error('Failed to fetch tests:', e);
        } finally {
            setLoading(false);
        }
    }, [isTeacher, pageSize]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const handleCardClick = (test) => setSelectedTest(test);
    const handleCloseModal = () => setSelectedTest(null);

    const handleStartTest = async (testId) => {
        try {
            const response = await assessmentApi.attempts.start(testId);
            const attemptId = response.data?.id || response.data;
            navigate(`/tests/${testId}/attempt/${attemptId}`);
        } catch (e) {
            console.error('Failed to start test:', e);
        }
    };

    const handleContextMenu = (e, test) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({test, x: e.clientX, y: e.clientY});
    };

    const handleEditTest = (test) => {
        setContextMenu(null);
        navigate(`/tests/${test.id}/edit`);
    };

    const handleDeleteTest = (test) => {
        setContextMenu(null);
        setDeleteTarget(test);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await assessmentApi.tests.remove(deleteTarget.id);

            setTests(prev => {
                const next = prev.filter(item => item.id !== deleteTarget.id);

                // если удалили последний элемент на странице — сдвигаем page назад при необходимости
                const nextPages = Math.max(1, Math.ceil(next.length / pageSize));
                setPage(p => Math.min(p, nextPages));

                return next;
            });

            if (selectedTest?.id === deleteTarget.id) setSelectedTest(null);
            setDeleteTarget(null);
        } catch (e) {
            console.error('Failed to delete test:', e);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleCreateTest = () => navigate('/tests/create');

    useEffect(() => {
        if (!contextMenu) return;
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenu]);

    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <Layout>
            <div className="test-list">
                <h1 className="test-list__title">Мои тесты</h1>

                {loading ? (
                    <div className="test-list__loading">Загрузка...</div>
                ) : (
                    <>
                        <div className="test-list__grid">
                            {pageTests.map((test) => (
                                <TestCard
                                    key={test.id}
                                    test={test}
                                    isTeacher={isTeacher}
                                    onClick={() => handleCardClick(test)}
                                    onContextMenu={(e) => handleContextMenu(e, test)}
                                />
                            ))}
                        </div>

                        {tests.length > 0 && (
                            <div className="pagination">
                                <button
                                    className="pagination__btn"
                                    disabled={!canPrev}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    Назад
                                </button>

                                <span className="pagination__info">
                                  {page} / {totalPages}
                                </span>

                                <button
                                    className="pagination__btn"
                                    disabled={!canNext}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                >
                                    Вперёд
                                </button>
                            </div>
                        )}
                    </>
                )}

                {tests.length === 0 && !loading && (
                    <div className="test-list__empty">Тесты не найдены</div>
                )}

                {contextMenu && (
                    <div
                        className="context-menu"
                        style={{top: contextMenu.y, left: contextMenu.x}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="context-menu__item" onClick={() => handleEditTest(contextMenu.test)}>
                            Редактировать
                        </button>
                        <button className="context-menu__item context-menu__item--danger"
                                onClick={() => handleDeleteTest(contextMenu.test)}>
                            Удалить
                        </button>
                    </div>
                )}

                {selectedTest && (
                    <TestDetailModal
                        test={selectedTest}
                        onClose={handleCloseModal}
                        onStart={handleStartTest}
                    />
                )}

                <ConfirmDeleteModal
                    isOpen={Boolean(deleteTarget)}
                    title="Удалить тест"
                    itemName={deleteTarget?.title || deleteTarget?.name || 'Тест'}
                    description="Действие нельзя отменить. Удалённый тест и его попытки станут недоступны."
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleConfirmDelete}
                    loading={deleteLoading}
                />

                {isTeacher && (
                    <button className="fab" onClick={handleCreateTest} title="Создать тест">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                )}
            </div>
        </Layout>
    );
}
