/**
 * Хук useAutoTests
 * Управляет запуском автотестов и хранением их результатов
 */
import { useState, useCallback, useMemo } from 'react';
import {
    AUTO_TEST_FIXED_STEP_COUNT,
    AUTO_TEST_PER_QUESTION_STEP_COUNT,
    buildAutoTestQuestions,
} from '../constants/autotest.js';
import { calcPercent } from '../utils/formatters.js';
import { makeEndpointKey } from '../utils/swagger.js';

/**
 * Хук для управления состоянием автотестов и их выполнением
 *
 * @param {Object} options
 * @param {Array} options.serviceGroups - Группы сервисов для поиска метаданных эндпоинтов
 * @returns {Object} Состояние автотестов и набор обработчиков
 */
export default function useAutoTests({ serviceGroups = [] }) {
    const [autoTestRunning, setAutoTestRunning] = useState(false);
    const [autoTestResults, setAutoTestResults] = useState([]);
    const [autoTestView, setAutoTestView] = useState('grouped');
    const [expandedAutoTestRows, setExpandedAutoTestRows] = useState({});
    const [autoTestAutoExpand, setAutoTestAutoExpand] = useState(false);
    const [autoTestActiveIndex, setAutoTestActiveIndex] = useState(-1);

    // Считаем ожидаемое количество шагов
    const autoTestTemplateCount = useMemo(
        () => buildAutoTestQuestions('template').length,
        [],
    );
    const autoTestExpectedTotal = useMemo(
        () => AUTO_TEST_FIXED_STEP_COUNT + autoTestTemplateCount * AUTO_TEST_PER_QUESTION_STEP_COUNT,
        [autoTestTemplateCount],
    );

    // Расчёт прогресса
    const autoTestCompleted = autoTestResults.length;
    const autoTestRemaining = useMemo(
        () => Math.max(autoTestExpectedTotal - autoTestCompleted, 0),
        [autoTestExpectedTotal, autoTestCompleted],
    );
    const autoTestProgress = calcPercent(autoTestCompleted, autoTestExpectedTotal);

    // Сводная статистика
    const autoTestSummary = useMemo(() => {
        const summary = { total: autoTestResults.length, success: 0, failed: 0, skipped: 0 };

        autoTestResults.forEach((item) => {
            if (item.status === 'success') summary.success += 1;
            else if (item.status === 'failed') summary.failed += 1;
            else if (item.status === 'skipped') summary.skipped += 1;
        });

        return summary;
    }, [autoTestResults]);

    // Результаты по статусам
    const autoTestByStatus = useMemo(() => ({
        success: autoTestResults.filter((item) => item.status === 'success'),
        failed: autoTestResults.filter((item) => item.status === 'failed'),
        skipped: autoTestResults.filter((item) => item.status === 'skipped'),
    }), [autoTestResults]);

    // Карта соответствия эндпоинта -> (serviceTitle, groupTitle)
    const endpointGroupLookup = useMemo(() => {
        const map = new Map();

        serviceGroups.forEach((service) => {
            service.groups.forEach((group) => {
                const groupTitle = group.title || 'Общее';

                group.items.forEach((item) => {
                    const key = makeEndpointKey(service.serviceKey, item.method, item.path);
                    map.set(key, {
                        serviceTitle: service.serviceTitle,
                        groupTitle,
                    });
                });
            });
        });

        return map;
    }, [serviceGroups]);

    // Группируем результаты для отображения
    const groupedAutoTests = useMemo(() => {
        const serviceMap = new Map();

        autoTestResults.forEach((item) => {
            const key = makeEndpointKey(item.service, item.method, item.path);
            const meta = endpointGroupLookup.get(key);

            const serviceTitle = meta?.serviceTitle || item.service || 'Общее';
            const groupTitle = meta?.groupTitle || 'Общее';

            if (!serviceMap.has(serviceTitle)) {
                serviceMap.set(serviceTitle, new Map());
            }

            const groups = serviceMap.get(serviceTitle);
            if (!groups.has(groupTitle)) {
                groups.set(groupTitle, []);
            }

            groups.get(groupTitle).push(item);
        });

        return Array.from(serviceMap.entries())
            .map(([serviceTitle, groups]) => ({
                serviceTitle,
                groups: Array.from(groups.entries())
                    .map(([groupTitle, items]) => ({
                        groupTitle,
                        items: items.slice().sort((a, b) => {
                            if (a.path === b.path) {
                                return a.method.localeCompare(b.method);
                            }
                            return a.path.localeCompare(b.path);
                        }),
                    }))
                    .sort((a, b) => a.groupTitle.localeCompare(b.groupTitle)),
            }))
            .sort((a, b) => a.serviceTitle.localeCompare(b.serviceTitle));
    }, [autoTestResults, endpointGroupLookup]);

    // Доступные режимы просмотра
    const autoTestViews = useMemo(() => ([
        { key: 'grouped', label: 'По сервисам и группам' },
        { key: 'success', label: 'Пройденные' },
        { key: 'skipped', label: 'Пропущенные' },
        { key: 'failed', label: 'Проваленные' },
    ]), []);

    // Данные для диаграмм
    const executedTotal = autoTestSummary.success + autoTestSummary.failed;

    const statusSegments = useMemo(() => ([
        { key: 'success', label: 'Успешно', value: autoTestSummary.success, color: '#22c55e' },
        { key: 'failed', label: 'Ошибка', value: autoTestSummary.failed, color: '#ef4444' },
        { key: 'skipped', label: 'Пропущено', value: autoTestSummary.skipped, color: '#94a3b8' },
    ]), [autoTestSummary]);

    const qualitySegments = useMemo(() => ([
        { key: 'success', label: 'Успех', value: autoTestSummary.success, color: '#16a34a' },
        { key: 'failed', label: 'Сбой', value: autoTestSummary.failed, color: '#f97316' },
    ]), [autoTestSummary]);

    const coverageSegments = useMemo(() => ([
        { key: 'executed', label: 'Выполнено', value: executedTotal, color: '#0ea5e9' },
        { key: 'skipped', label: 'Пропущено', value: autoTestSummary.skipped, color: '#cbd5e1' },
    ]), [autoTestSummary, executedTotal]);

    const statusSuccessRate = calcPercent(autoTestSummary.success, autoTestSummary.total);
    const qualitySuccessRate = calcPercent(autoTestSummary.success, executedTotal);
    const coverageRate = calcPercent(executedTotal, autoTestSummary.total);

    // Переключение раскрытия строки
    const toggleAutoTestRow = useCallback((key) => {
        setExpandedAutoTestRows((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    // Добавить результат (для раннера тестов)
    const pushResult = useCallback((result) => {
        setAutoTestResults((prev) => [...prev, result]);
        setAutoTestActiveIndex((prev) => prev + 1);

        // Автораскрытие (состояние строки будет управляться общим флагом autoTestAutoExpand)
        if (result.id) {
            setExpandedAutoTestRows((prev) => ({
                ...prev,
                [result.id]: false,
            }));
        }
    }, []);

    // Очистка результатов
    const clearResults = useCallback(() => {
        setAutoTestResults([]);
        setExpandedAutoTestRows({});
        setAutoTestActiveIndex(-1);
    }, []);

    // Старт прогона тестов
    const startTestRun = useCallback(() => {
        setAutoTestRunning(true);
        clearResults();
    }, [clearResults]);

    // Завершение прогона тестов
    const endTestRun = useCallback(() => {
        setAutoTestRunning(false);
    }, []);

    return {
        // Состояние
        autoTestRunning,
        autoTestResults,
        autoTestView,
        expandedAutoTestRows,
        autoTestAutoExpand,
        autoTestActiveIndex,

        // Сеттеры / переключатели
        setAutoTestView,
        setAutoTestAutoExpand,
        toggleAutoTestRow,

        // Вычисляемые значения
        autoTestExpectedTotal,
        autoTestCompleted,
        autoTestRemaining,
        autoTestProgress,
        autoTestSummary,
        autoTestByStatus,
        groupedAutoTests,
        autoTestViews,

        // Данные для диаграмм
        statusSegments,
        qualitySegments,
        coverageSegments,
        statusSuccessRate,
        qualitySuccessRate,
        coverageRate,
        executedTotal,

        // Действия
        pushResult,
        clearResults,
        startTestRun,
        endTestRun,
        setAutoTestRunning,
    };
}
