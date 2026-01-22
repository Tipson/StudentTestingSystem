/**
 * Компонент ScenariosTab
 * Отображает сценарии тестирования с визуализацией процесса выполнения
 */
import React, {useMemo} from 'react';
import {
    SCENARIO_DEFINITIONS,
    getScenarioExpectedTotal,
    getScenarioStepDefinitions,
    matchScenarioStepResult,
    buildScenarioStepSummary,
} from '../../constants/index.js';
import {
    calcPercent,
    buildConicGradient,
    formatAutoTestResponse,
    limitAutoTestMessage,
    getAutoTestStatusLabel,
    makeResultRowKey,
} from '../../utils/index.js';

/**
 * Компонент строки результата сценария
 */
function ScenarioResultRow({
                               item,
                               index,
                               isExpanded,
                               onToggle,
                               autoExpand,
                           }) {
    const rowKey = makeResultRowKey(item, index);
    const statusClass = `swagger-status swagger-status-${item.status || 'pending'}`;
    const hasDetails = Boolean(item.responseData || item.error);
    const expanded = autoExpand || isExpanded;

    return (
        <div className="swagger-test-row" key={rowKey}>
            <div className="swagger-test-main">
                <span className={statusClass}>
                    {getAutoTestStatusLabel(item.status)}
                </span>
                <span className="swagger-test-method">{item.method}</span>
                <span className="swagger-test-path">{item.path}</span>
                <span className="swagger-test-message">
                    {limitAutoTestMessage(item.message)}
                </span>
                {hasDetails && (
                    <button
                        type="button"
                        className={`swagger-toggle ${expanded ? 'expanded' : ''}`}
                        onClick={() => onToggle(rowKey)}
                        aria-label={expanded ? 'Скрыть детали' : 'Показать детали'}
                    >
                        <span className="swagger-chevron"/>
                    </button>
                )}
            </div>
            {hasDetails && expanded && (
                <div className="swagger-test-details">
                    <pre className="swagger-test-response">
                        {formatAutoTestResponse(item)}
                    </pre>
                </div>
            )}
        </div>
    );
}

/**
 * Компонент кольцевой диаграммы (donut chart)
 */
function DonutChart({
                        title,
                        subtitle,
                        segments,
                        total,
                        centerValue,
                        centerLabel,
                        gradient,
                    }) {
    return (
        <div className="swagger-chart-card">
            <div className="swagger-chart-header">
                <h3>{title}</h3>
                <span className="swagger-chart-total">{subtitle}</span>
            </div>
            <div
                className="swagger-donut"
                style={{'--chart-gradient': gradient}}
            >
                <div className="swagger-donut-center">
                    <div className="swagger-donut-value">{centerValue}%</div>
                    <div className="swagger-donut-label">{centerLabel}</div>
                </div>
            </div>
            <div className="swagger-chart-legend">
                {segments.map((segment) => (
                    <div key={segment.key} className="swagger-chart-legend-row">
                        <span
                            className="swagger-chart-dot"
                            style={{'--dot-color': segment.color}}
                        />
                        <span className="swagger-chart-label">{segment.label}</span>
                        <span className="swagger-chart-value">{segment.value}</span>
                        <span className="swagger-chart-percent">
                            {calcPercent(segment.value, total)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ScenariosTab({
                                         // Состояние
                                         scenarioRunning,
                                         scenarioResults,
                                         activeScenarioId,
                                         selectedScenarioId,
                                         expandedScenarioRows,
                                         expandedScenarioSteps,
                                         scenarioAutoExpand,
                                         // Обработчики
                                         onRunScenario,
                                         onStopScenario,
                                         onClearResults,
                                         onSelectScenario,
                                         onToggleRow,
                                         onToggleStep,
                                         onAutoExpandChange,
                                     }) {
    // Выбранный и активный сценарии
    const selectedScenario = useMemo(
        () => SCENARIO_DEFINITIONS.find((s) => s.id === selectedScenarioId),
        [selectedScenarioId],
    );
    const activeScenario = useMemo(
        () => SCENARIO_DEFINITIONS.find((s) => s.id === activeScenarioId),
        [activeScenarioId],
    );

    // Ожидаемое количество шагов для выбранного сценария
    const selectedScenarioExpectedTotal = useMemo(
        () => getScenarioExpectedTotal(selectedScenarioId),
        [selectedScenarioId],
    );
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

    // Сводка по текущим результатам
    const scenarioSummary = useMemo(
        () => buildScenarioStepSummary(activeScenarioResults),
        [activeScenarioResults],
    );
    const scenarioCompleted = activeScenarioResults.length;
    const scenarioRemaining = Math.max(scenarioExpectedTotal - scenarioCompleted, 0);

    // Прогресс по этапам для выбранного сценария
    const scenarioStepProgress = useMemo(() => {
        const definitions = getScenarioStepDefinitions(selectedScenarioId);
        const results = selectedScenarioId === activeScenarioId ? activeScenarioResults : [];

        return definitions.map((def) => {
            const matchedResults = results.filter((item) =>
                matchScenarioStepResult(item, def.matchers),
            );
            const summary = buildScenarioStepSummary(matchedResults);

            return {
                label: def.label,
                matchers: def.matchers,
                results: matchedResults,
                summary,
                status: summary.failed > 0
                    ? 'failed'
                    : summary.success > 0
                        ? 'success'
                        : summary.skipped > 0
                            ? 'skipped'
                            : 'pending',
            };
        });
    }, [selectedScenarioId, activeScenarioId, activeScenarioResults]);

    // Сводка для отображения выбранного сценария
    const selectedScenarioSummary = useMemo(() => {
        if (selectedScenarioId !== activeScenarioId) {
            return {total: 0, success: 0, failed: 0, skipped: 0};
        }
        return scenarioSummary;
    }, [selectedScenarioId, activeScenarioId, scenarioSummary]);

    const selectedScenarioCompleted = useMemo(() => {
        if (selectedScenarioId !== activeScenarioId) return 0;
        return scenarioCompleted;
    }, [selectedScenarioId, activeScenarioId, scenarioCompleted]);

    // Сегменты диаграмм
    const scenarioStatusSegments = useMemo(() => ([
        {key: 'success', label: 'Успешно', value: selectedScenarioSummary.success, color: '#22c55e'},
        {key: 'failed', label: 'Ошибка', value: selectedScenarioSummary.failed, color: '#ef4444'},
        {key: 'skipped', label: 'Пропущено', value: selectedScenarioSummary.skipped, color: '#94a3b8'},
    ]), [selectedScenarioSummary]);

    const scenarioProgressSegments = useMemo(() => ([
        {key: 'completed', label: 'Выполнено', value: selectedScenarioCompleted, color: '#0ea5e9'},
        {
            key: 'remaining',
            label: 'Осталось',
            value: Math.max(selectedScenarioExpectedTotal - selectedScenarioCompleted, 0),
            color: '#cbd5e1'
        },
    ]), [selectedScenarioCompleted, selectedScenarioExpectedTotal]);

    // Градиенты для диаграмм
    const scenarioStatusGradient = useMemo(
        () => buildConicGradient(scenarioStatusSegments, selectedScenarioSummary.total),
        [scenarioStatusSegments, selectedScenarioSummary.total],
    );
    const scenarioProgressGradient = useMemo(
        () => buildConicGradient(scenarioProgressSegments, selectedScenarioExpectedTotal),
        [scenarioProgressSegments, selectedScenarioExpectedTotal],
    );

    // Проценты
    const scenarioStatusRate = calcPercent(selectedScenarioSummary.success, selectedScenarioSummary.total);
    const scenarioProgressRate = calcPercent(selectedScenarioCompleted, selectedScenarioExpectedTotal);

    return (
        <section className="swagger-scenarios">
            {/* Панель выбора сценария */}
            <div className="swagger-panel">
                <div className="swagger-tests-header">
                    <h2>Сценарии тестирования</h2>
                    <div className="swagger-tests-controls">
                        {scenarioRunning ? (
                            <button
                                className="swagger-button secondary"
                                type="button"
                                onClick={onStopScenario}
                            >
                                Остановить
                            </button>
                        ) : (
                            <button
                                className="swagger-button"
                                type="button"
                                onClick={() => onRunScenario(selectedScenarioId)}
                                disabled={!selectedScenarioId}
                            >
                                Запустить сценарий
                            </button>
                        )}
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={onClearResults}
                            disabled={scenarioRunning || !scenarioResults.length}
                        >
                            Очистить
                        </button>
                    </div>
                </div>

                {/* Карточки сценариев */}
                <div className="swagger-scenario-grid">
                    {SCENARIO_DEFINITIONS.map((scenario) => {
                        const isSelected = scenario.id === selectedScenarioId;
                        const isActive = scenario.id === activeScenarioId;
                        const cardClass = [
                            'swagger-scenario-card',
                            isSelected ? 'selected' : '',
                            isActive ? 'active' : '',
                        ].filter(Boolean).join(' ');

                        return (
                            <div
                                key={scenario.id}
                                className={cardClass}
                                onClick={() => onSelectScenario(scenario.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        onSelectScenario(scenario.id);
                                    }
                                }}
                            >
                                <div className="swagger-scenario-card-header">
                                    <span className="swagger-scenario-tag">{scenario.tag}</span>
                                    {isActive && scenarioRunning && (
                                        <span className="swagger-scenario-running">Выполняется...</span>
                                    )}
                                </div>
                                <h3 className="swagger-scenario-title">{scenario.title}</h3>
                                <p className="swagger-scenario-desc">{scenario.description}</p>
                                <div className="swagger-scenario-meta">
                                    <span>{scenario.expectedTotal} шагов</span>
                                    <span>{scenario.steps.length} этапов</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Детали выбранного сценария */}
            {selectedScenario && (
                <div className="swagger-panel">
                    <div className="swagger-scenario-detail">
                        <div className="swagger-scenario-detail-info">
                            <h2>{selectedScenario.title}</h2>
                            <p className="swagger-subtitle">{selectedScenario.description}</p>

                            {/* Прогресс по этапам */}
                            {scenarioStepProgress.length > 0 ? (
                                <div className="swagger-scenario-steps">
                                    {scenarioStepProgress.map((step, stepIndex) => {
                                        const stepKey = `step-${stepIndex}`;
                                        const isExpanded = expandedScenarioSteps?.[stepKey];
                                        const canToggle = step.results.length > 0;
                                        const stepStatusClass = `swagger-scenario-step swagger-scenario-step-${step.status}`;

                                        return (
                                            <div key={stepKey} className={stepStatusClass}>
                                                <div className="swagger-scenario-step-header">
                                                    <span className="swagger-scenario-step-number">
                                                        {stepIndex + 1}
                                                    </span>
                                                    <span className="swagger-scenario-step-label">
                                                        {step.label}
                                                    </span>
                                                    <div className="swagger-scenario-step-stats">
                                                        {step.summary.total > 0 && (
                                                            <>
                                                                <span className="success">{step.summary.success}</span>
                                                                <span className="failed">{step.summary.failed}</span>
                                                                <span className="skipped">{step.summary.skipped}</span>
                                                            </>
                                                        )}
                                                        {canToggle && (
                                                            <button
                                                                type="button"
                                                                className={`swagger-toggle ${isExpanded ? 'expanded' : ''}`}
                                                                onClick={() => onToggleStep(stepKey)}
                                                                aria-label={isExpanded ? 'Скрыть тесты' : 'Показать тесты'}
                                                            >
                                                                <span className="swagger-chevron"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {canToggle && isExpanded && (
                                                    <div className="swagger-scenario-step-tests">
                                                        {step.results.map((item, resultIndex) => (
                                                            <ScenarioResultRow
                                                                key={makeResultRowKey(item, resultIndex)}
                                                                item={item}
                                                                index={resultIndex}
                                                                isExpanded={expandedScenarioRows?.[makeResultRowKey(item, resultIndex)]}
                                                                onToggle={onToggleRow}
                                                                autoExpand={scenarioAutoExpand}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="swagger-subtitle">Шаги сценария не описаны.</p>
                            )}

                            {/* Итоги */}
                            <div className="swagger-scenario-result">
                                {selectedScenarioId === activeScenarioId && scenarioResults.length ? (
                                    <span>
                                        Результат: успешно {scenarioSummary.success}, ошибки {scenarioSummary.failed},
                                        пропущено {scenarioSummary.skipped}.
                                    </span>
                                ) : (
                                    <span>Результат: нет данных для выбранного сценария.</span>
                                )}
                            </div>
                        </div>

                        {/* Диаграммы */}
                        <div className="swagger-scenario-detail-charts">
                            <DonutChart
                                title="Статусы"
                                subtitle={`${selectedScenarioSummary.total} шагов`}
                                segments={scenarioStatusSegments}
                                total={selectedScenarioSummary.total}
                                centerValue={scenarioStatusRate}
                                centerLabel="успех"
                                gradient={scenarioStatusGradient}
                            />
                            <DonutChart
                                title="Выполнение"
                                subtitle={`${selectedScenarioCompleted} из ${selectedScenarioExpectedTotal}`}
                                segments={scenarioProgressSegments}
                                total={selectedScenarioExpectedTotal}
                                centerValue={scenarioProgressRate}
                                centerLabel="готово"
                                gradient={scenarioProgressGradient}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Панель всех результатов */}
            <div className="swagger-panel">
                <div className="swagger-tests-header">
                    <h2>Результаты сценария</h2>
                    <div className="swagger-tests-controls">
                        <label className="swagger-checkbox">
                            <input
                                type="checkbox"
                                checked={scenarioAutoExpand}
                                onChange={(e) => onAutoExpandChange(e.target.checked)}
                            />
                            <span>Открывать ответы заранее</span>
                        </label>
                        {activeScenario?.title && (
                            <span className="swagger-hint">
                                {selectedScenarioId === activeScenarioId
                                    ? activeScenario.title
                                    : `Результаты: ${activeScenario.title}`}
                            </span>
                        )}
                    </div>
                </div>

                <div className="swagger-tests-summary">
                    <span>Выполнено: {scenarioCompleted} из {scenarioExpectedTotal}</span>
                    <span>В процессе: {scenarioRemaining}</span>
                    <span>Успешно: {scenarioSummary.success}</span>
                    <span>Ошибки: {scenarioSummary.failed}</span>
                    <span>Пропущено: {scenarioSummary.skipped}</span>
                </div>

                {scenarioResults.length ? (
                    <div className="swagger-tests-list">
                        {scenarioResults.map((item, index) => (
                            <ScenarioResultRow
                                key={makeResultRowKey(item, index)}
                                item={item}
                                index={index}
                                isExpanded={expandedScenarioRows?.[makeResultRowKey(item, index)]}
                                onToggle={onToggleRow}
                                autoExpand={scenarioAutoExpand}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="swagger-subtitle">Нет результатов. Запустите сценарий.</p>
                )}
            </div>
        </section>
    );
}
