/**
 * Компонент TestsTab
 * Отображает результаты автотестов с диаграммами и сгруппированным представлением
 */
import React, { useMemo } from 'react';
import testCatImage from '../../testCat.png';
import {
    calcPercent,
    buildConicGradient,
    formatAutoTestResponse,
    limitAutoTestMessage,
    getAutoTestStatusLabel,
    makeResultRowKey,
} from '../../utils/index.js';

/**
 * Отрисовывает одну строку результата теста
 */
function TestResultRow({
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
                        <span className="swagger-chevron" />
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
 * Кольцевая диаграмма (donut) с легендой
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
                style={{ '--chart-gradient': gradient }}
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
                            style={{ '--dot-color': segment.color }}
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

export default function TestsTab({
                                     // Состояние тестов
                                     autoTestRunning,
                                     autoTestResults,
                                     autoTestView,
                                     expandedAutoTestRows,
                                     autoTestAutoExpand,
                                     // Вычисленные значения
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
                                     // Обработчики
                                     onRunTests,
                                     onStopTests,
                                     onClearResults,
                                     onViewChange,
                                     onAutoExpandChange,
                                     onToggleRow,
                                 }) {
    // Построение градиентов для диаграмм
    const statusGradient = useMemo(
        () => buildConicGradient(statusSegments, autoTestSummary.total),
        [statusSegments, autoTestSummary.total],
    );
    const qualityGradient = useMemo(
        () => buildConicGradient(qualitySegments, executedTotal),
        [qualitySegments, executedTotal],
    );
    const coverageGradient = useMemo(
        () => buildConicGradient(coverageSegments, autoTestSummary.total),
        [coverageSegments, autoTestSummary.total],
    );

    // Результаты для отображения в зависимости от выбранного режима
    const displayResults = useMemo(() => {
        if (autoTestView === 'grouped') return null;
        return autoTestByStatus[autoTestView] || [];
    }, [autoTestView, autoTestByStatus]);

    return (
        <section className="swagger-tests">
            <div className="swagger-panel swagger-tests-panel">
                <div className="swagger-tests-header">
                    <h2>Автотесты API</h2>
                    <div className="swagger-tests-controls">
                        {autoTestRunning ? (
                            <button
                                className="swagger-button secondary"
                                type="button"
                                onClick={onStopTests}
                            >
                                Остановить
                            </button>
                        ) : (
                            <button
                                className="swagger-button"
                                type="button"
                                onClick={onRunTests}
                            >
                                Запустить тесты
                            </button>
                        )}
                        <button
                            className="swagger-button ghost"
                            type="button"
                            onClick={onClearResults}
                            disabled={autoTestRunning || !autoTestResults.length}
                        >
                            Очистить
                        </button>
                    </div>
                </div>

                {/* Прогресс */}
                {autoTestRunning && (
                    <div className="swagger-tests-progress">
                        <div className="swagger-progress-bar">
                            <div
                                className="swagger-progress-fill"
                                style={{ width: `${autoTestProgress}%` }}
                            />
                        </div>
                        <span className="swagger-progress-text">
                            {autoTestCompleted} / {autoTestExpectedTotal} ({autoTestProgress}%)
                        </span>
                    </div>
                )}

                {/* Диаграммы */}
                {autoTestResults.length > 0 && (
                    <div className="swagger-tests-charts">
                        <DonutChart
                            title="Статусы"
                            subtitle={`${autoTestSummary.total} тестов`}
                            segments={statusSegments}
                            total={autoTestSummary.total}
                            centerValue={statusSuccessRate}
                            centerLabel="успех"
                            gradient={statusGradient}
                        />
                        <DonutChart
                            title="Качество"
                            subtitle={`${executedTotal} выполнено`}
                            segments={qualitySegments}
                            total={executedTotal}
                            centerValue={qualitySuccessRate}
                            centerLabel="качество"
                            gradient={qualityGradient}
                        />
                        <DonutChart
                            title="Покрытие"
                            subtitle={`${autoTestSummary.total} тестов`}
                            segments={coverageSegments}
                            total={autoTestSummary.total}
                            centerValue={coverageRate}
                            centerLabel="покрытие"
                            gradient={coverageGradient}
                        />
                    </div>
                )}

                {/* Сводка */}
                <div className="swagger-tests-summary">
                    <span>Всего: {autoTestSummary.total}</span>
                    <span>Успешно: {autoTestSummary.success}</span>
                    <span>Ошибки: {autoTestSummary.failed}</span>
                    <span>Пропущено: {autoTestSummary.skipped}</span>
                    <span>Осталось: {autoTestRemaining}</span>
                </div>

                {/* Пустое состояние */}
                {!autoTestResults.length && !autoTestRunning && (
                    <div className="swagger-tests-empty">
                        <img
                            src={testCatImage}
                            alt="Тестовый кот"
                            className="swagger-tests-cat"
                        />
                        <p>Нажмите "Запустить тесты" для проверки API</p>
                    </div>
                )}
            </div>

            {/* Панель результатов */}
            {autoTestResults.length > 0 && (
                <div className="swagger-panel">
                    <div className="swagger-tests-header">
                        <h2>Результаты</h2>
                        <div className="swagger-tests-controls">
                            <select
                                className="swagger-select"
                                value={autoTestView}
                                onChange={(e) => onViewChange(e.target.value)}
                            >
                                {autoTestViews.map((view) => (
                                    <option key={view.key} value={view.key}>
                                        {view.label}
                                    </option>
                                ))}
                            </select>
                            <label className="swagger-checkbox">
                                <input
                                    type="checkbox"
                                    checked={autoTestAutoExpand}
                                    onChange={(e) => onAutoExpandChange(e.target.checked)}
                                />
                                <span>Раскрывать детали</span>
                            </label>
                        </div>
                    </div>

                    {/* Сгруппированный режим */}
                    {autoTestView === 'grouped' && (
                        <div className="swagger-tests-grouped">
                            {groupedAutoTests.map((service) => (
                                <div key={service.serviceTitle} className="swagger-tests-service">
                                    <h3 className="swagger-tests-service-title">
                                        {service.serviceTitle}
                                    </h3>
                                    {service.groups.map((group) => (
                                        <div key={group.groupTitle} className="swagger-tests-group">
                                            <h4 className="swagger-tests-group-title">
                                                {group.groupTitle}
                                            </h4>
                                            <div className="swagger-tests-list">
                                                {group.items.map((item, index) => (
                                                    <TestResultRow
                                                        key={makeResultRowKey(item, index)}
                                                        item={item}
                                                        index={index}
                                                        isExpanded={expandedAutoTestRows[makeResultRowKey(item, index)]}
                                                        onToggle={onToggleRow}
                                                        autoExpand={autoTestAutoExpand}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Режим фильтра по статусу */}
                    {autoTestView !== 'grouped' && displayResults && (
                        <div className="swagger-tests-list">
                            {displayResults.length > 0 ? (
                                displayResults.map((item, index) => (
                                    <TestResultRow
                                        key={makeResultRowKey(item, index)}
                                        item={item}
                                        index={index}
                                        isExpanded={expandedAutoTestRows[makeResultRowKey(item, index)]}
                                        onToggle={onToggleRow}
                                        autoExpand={autoTestAutoExpand}
                                    />
                                ))
                            ) : (
                                <p className="swagger-subtitle">
                                    Нет результатов с выбранным статусом.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
