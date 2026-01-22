/**
 * Хук useScenarios
 * Управляет выполнением сценариев и их результатами
 */
import { useState, useCallback, useMemo } from 'react';
import {
    SCENARIO_DEFINITIONS,
    getScenarioExpectedTotal,
    buildScenarioStepSummary,
} from '../constants/index.js';
import { makeResultRowKey } from '../utils/index.js';

/**
 * Хук для управления состоянием сценариев и их выполнением
 * @returns {Object} Состояние сценариев и обработчики
 */
export default function useScenarios() {
    const [scenarioRunning, setScenarioRunning] = useState(false);
    const [scenarioResults, setScenarioResults] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState('');
    const [selectedScenarioId, setSelectedScenarioId] = useState(
        SCENARIO_DEFINITIONS[0]?.id || '',
    );
    const [expandedScenarioRows, setExpandedScenarioRows] = useState({});
    const [expandedScenarioSteps, setExpandedScenarioSteps] = useState({});
    const [scenarioAutoExpand, setScenarioAutoExpand] = useState(false);

    // Ожидаемое количество шагов для активного сценария
    const scenarioExpectedTotal = useMemo(
        () => getScenarioExpectedTotal(activeScenarioId),
        [activeScenarioId],
    );

    // Результаты только для активного сценария
    const activeScenarioResults = useMemo(() => {
        if (!activeScenarioId) return scenarioResults;

        return scenarioResults.filter((item) => {
            const id = item.id || '';
            return id.includes(activeScenarioId) || id.startsWith('scenario-');
        });
    }, [scenarioResults, activeScenarioId]);

    // Сводная статистика по сценарию
    const scenarioSummary = useMemo(
        () => buildScenarioStepSummary(activeScenarioResults),
        [activeScenarioResults],
    );

    // Расчёт прогресса
    const scenarioCompleted = activeScenarioResults.length;
    const scenarioRemaining = Math.max(scenarioExpectedTotal - scenarioCompleted, 0);

    // Метаданные сценариев
    const activeScenario = useMemo(
        () => SCENARIO_DEFINITIONS.find((s) => s.id === activeScenarioId),
        [activeScenarioId],
    );
    const selectedScenario = useMemo(
        () => SCENARIO_DEFINITIONS.find((s) => s.id === selectedScenarioId),
        [selectedScenarioId],
    );

    // Переключение раскрытия строки результата
    const toggleScenarioRow = useCallback((key) => {
        setExpandedScenarioRows((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    // Переключение раскрытия шага сценария
    const toggleScenarioStep = useCallback((key) => {
        setExpandedScenarioSteps((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    // Добавить результат выполнения шага
    const pushResult = useCallback((result) => {
        setScenarioResults((prev) => [...prev, result]);
    }, []);

    // Очистить результаты сценария
    const clearResults = useCallback(() => {
        setScenarioResults([]);
        setExpandedScenarioRows({});
        setExpandedScenarioSteps({});
    }, []);

    // Запуск сценария
    const startScenario = useCallback((scenarioId) => {
        setScenarioRunning(true);
        setActiveScenarioId(scenarioId);
        setSelectedScenarioId(scenarioId);
        clearResults();
    }, [clearResults]);

    // Завершение сценария
    const endScenario = useCallback(() => {
        setScenarioRunning(false);
    }, []);

    // Выбор сценария (только для просмотра)
    const selectScenario = useCallback((scenarioId) => {
        setSelectedScenarioId(scenarioId);
    }, []);

    return {
        // Состояние
        scenarioRunning,
        scenarioResults,
        activeScenarioId,
        selectedScenarioId,
        expandedScenarioRows,
        expandedScenarioSteps,
        scenarioAutoExpand,

        // Сеттеры и переключатели
        setScenarioAutoExpand,
        toggleScenarioRow,
        toggleScenarioStep,
        selectScenario,

        // Вычисляемые значения
        scenarioExpectedTotal,
        activeScenarioResults,
        scenarioSummary,
        scenarioCompleted,
        scenarioRemaining,
        activeScenario,
        selectedScenario,

        // Действия
        pushResult,
        clearResults,
        startScenario,
        endScenario,
        setScenarioRunning,
        setActiveScenarioId,
    };
}
