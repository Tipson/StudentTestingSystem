/**
 * LoadTestingTab - вкладка нагрузочного тестирования
 * Позволяет запускать нагрузочные тесты для API endpoints
 */
import React, { useMemo, useState } from 'react';
import ScenariosTab from '../ScenariosTab/ScenariosTab.jsx';
import './LoadTestingTab.css';

const SUB_TABS = [
    { key: 'scenarios', label: 'Сценарии' },
    { key: 'endpoint', label: 'Отдельный метод' },
    { key: 'results', label: 'Результаты' },
];

const SCENARIO_PRESETS = [
    {
        id: 'full-test-lifecycle',
        title: 'Создание теста и вопросов',
        steps: 4,
        description: 'Создание теста -> 2 вопроса -> удаление теста',
    },
    {
        id: 'student-workflow',
        title: 'Прохождение теста студентом',
        steps: 8,
        description: 'Создание -> вопрос -> публикация -> попытка -> ответ -> завершение -> очистка',
    },
    {
        id: 'read-operations',
        title: 'Чтение теста',
        steps: 5,
        description: 'Создание -> список тестов -> тест -> вопросы -> удаление',
    },
];

const LOAD_TEST_SCENARIOS = SCENARIO_PRESETS.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    expectedTotal: scenario.steps,
    steps: Array.from({ length: scenario.steps }, () => ''),
}));

const POPULAR_ENDPOINTS = [
    { label: 'Получить список тестов', method: 'GET', path: '/api/tests' },
    { label: 'Создать тест', method: 'POST', path: '/api/tests' },
    { label: 'Получить тест', method: 'GET', path: '/api/tests/{id}' },
    { label: 'Создать вопрос', method: 'POST', path: '/api/tests/{testId}/questions' },
    { label: 'Начать попытку', method: 'POST', path: '/api/tests/{testId}/attempts' },
    { label: 'Отправить ответ', method: 'PUT', path: '/api/attempts/{attemptId}/answers/{questionId}' },
    { label: 'Завершить попытку', method: 'POST', path: '/api/attempts/{id}/submit' },
];

export default function LoadTestingTab({
    isRunning,
    testResults,
    liveMetrics,
    onRunTest,
    onStopTest,
    onClearResults,
}) {
    const [activeSubTab, setActiveSubTab] = useState('scenarios');
    const [testConfig, setTestConfig] = useState({
        type: 'scenario',
        loadType: 'rps',

        // Endpoint config
        method: 'GET',
        endpoint: '',
        body: '{}',
        headers: '{"Content-Type": "application/json"}',

        // Load config
        rps: 10,
        cycles: 100,
        duration: 60,

        // Scenario config
        scenarioId: null,
    });

    const selectedScenario = useMemo(
        () => SCENARIO_PRESETS.find((scenario) => scenario.id === testConfig.scenarioId),
        [testConfig.scenarioId],
    );

    const handleConfigChange = (field, value) => {
        setTestConfig((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubTabChange = (tabKey) => {
        setActiveSubTab(tabKey);
        if (tabKey === 'scenarios') {
            handleConfigChange('type', 'scenario');
        }
        if (tabKey === 'endpoint') {
            handleConfigChange('type', 'endpoint');
        }
    };

    const handleStartTest = () => {
        onRunTest(testConfig);
    };

    const renderScenarioLoadSummary = () => {
        if (!selectedScenario) return null;

        const stepCount = selectedScenario.steps || 0;
        if (!stepCount) return null;

        if (testConfig.loadType === 'rps') {
            const totalScenarios = testConfig.rps * testConfig.duration;
            const approxRequests = totalScenarios * stepCount;
            return (
                <small>
                    Примерно запросов: {approxRequests} (шагов в сценарии: {stepCount})
                </small>
            );
        }

        const approxRequests = testConfig.cycles * stepCount;
        return (
            <small>
                Примерно запросов: {approxRequests} (шагов в сценарии: {stepCount})
            </small>
        );
    };

    const renderScenarios = () => (
        <div className="swagger-load-scenarios">
            <ScenariosTab
                viewMode="selector"
                scenarios={LOAD_TEST_SCENARIOS}
                scenarioRunning={isRunning}
                selectedScenarioId={testConfig.scenarioId}
                activeScenarioId={isRunning ? testConfig.scenarioId : null}
                onSelectScenario={(scenarioId) => {
                    if (isRunning) return;
                    handleConfigChange('type', 'scenario');
                    handleConfigChange('scenarioId', scenarioId);
                }}
            />

            <div className="swagger-card">
                <h3>Параметры нагрузки</h3>
                <div className="swagger-form-grid">
                    <div className="swagger-form-group">
                        <label>Тип нагрузки</label>
                        <select
                            value={testConfig.loadType}
                            onChange={(e) => handleConfigChange('loadType', e.target.value)}
                            disabled={isRunning}
                        >
                            <option value="rps">Сценариев в секунду (RPS)</option>
                            <option value="cycles">Количество циклов</option>
                        </select>
                    </div>

                    {testConfig.loadType === 'rps' ? (
                        <>
                            <div className="swagger-form-group">
                                <label>Сценариев в секунду</label>
                                <input
                                    type="number"
                                    value={testConfig.rps}
                                    onChange={(e) => handleConfigChange('rps', Number(e.target.value))}
                                    min="1"
                                    max="1000"
                                    disabled={isRunning}
                                />
                                <small>От 1 до 1000 сценариев в секунду</small>
                            </div>
                            <div className="swagger-form-group">
                                <label>Длительность (секунды)</label>
                                <input
                                    type="number"
                                    value={testConfig.duration}
                                    onChange={(e) => handleConfigChange('duration', Number(e.target.value))}
                                    min="1"
                                    max="3600"
                                    disabled={isRunning}
                                />
                                <small>Всего сценариев: {testConfig.rps * testConfig.duration}</small>
                                {renderScenarioLoadSummary()}
                            </div>
                        </>
                    ) : (
                        <div className="swagger-form-group">
                            <label>Количество циклов</label>
                            <input
                                type="number"
                                value={testConfig.cycles}
                                onChange={(e) => handleConfigChange('cycles', Number(e.target.value))}
                                min="1"
                                max="100000"
                                disabled={isRunning}
                            />
                            <small>Каждый цикл выполняет все шаги сценария</small>
                            {renderScenarioLoadSummary()}
                        </div>
                    )}
                </div>

                <div className="swagger-actions">
                    {!isRunning ? (
                        <button
                            type="button"
                            className="swagger-btn swagger-btn-primary"
                            onClick={handleStartTest}
                            disabled={!testConfig.scenarioId}
                        >
                            Запустить тест
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="swagger-btn swagger-btn-danger"
                            onClick={onStopTest}
                        >
                            Остановить тест
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderEndpoint = () => (
        <div className="swagger-load-endpoint">
            <div className="swagger-card">
                <h3>Конфигурация метода</h3>

                <div className="swagger-form-group">
                    <label>Быстрый выбор</label>
                    <select
                        onChange={(e) => {
                            const selected = POPULAR_ENDPOINTS[e.target.value];
                            if (selected) {
                                handleConfigChange('method', selected.method);
                                handleConfigChange('endpoint', selected.path);
                            }
                        }}
                        disabled={isRunning}
                    >
                        <option value="">Выберите endpoint...</option>
                        {POPULAR_ENDPOINTS.map((ep, idx) => (
                            <option key={`${ep.method}-${ep.path}`} value={idx}>
                                {ep.method} - {ep.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="swagger-form-grid">
                    <div className="swagger-form-group">
                        <label>Метод</label>
                        <select
                            value={testConfig.method}
                            onChange={(e) => handleConfigChange('method', e.target.value)}
                            disabled={isRunning}
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>

                    <div className="swagger-form-group swagger-span-2">
                        <label>Endpoint</label>
                        <input
                            type="text"
                            value={testConfig.endpoint}
                            onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                            placeholder="/api/endpoint"
                            disabled={isRunning}
                        />
                    </div>
                </div>

                {(testConfig.method === 'POST' || testConfig.method === 'PUT' || testConfig.method === 'PATCH') && (
                    <div className="swagger-form-group">
                        <label>Тело запроса (JSON)</label>
                        <textarea
                            value={testConfig.body}
                            onChange={(e) => handleConfigChange('body', e.target.value)}
                            placeholder='{"key": "value"}'
                            rows="8"
                            disabled={isRunning}
                            className="swagger-code-input"
                        />
                        <small>Переменные: {'{{timestamp}}'}, {'{{index}}'}, {'{{randomId}}'}</small>
                    </div>
                )}

                <div className="swagger-form-group">
                    <label>Заголовки (JSON)</label>
                    <textarea
                        value={testConfig.headers}
                        onChange={(e) => handleConfigChange('headers', e.target.value)}
                        placeholder='{"Content-Type": "application/json"}'
                        rows="4"
                        disabled={isRunning}
                        className="swagger-code-input"
                    />
                </div>
            </div>

            <div className="swagger-card">
                <h3>Параметры нагрузки</h3>

                <div className="swagger-form-group">
                    <label>Тип нагрузки</label>
                    <select
                        value={testConfig.loadType}
                        onChange={(e) => handleConfigChange('loadType', e.target.value)}
                        disabled={isRunning}
                    >
                        <option value="rps">Запросов в секунду (RPS)</option>
                        <option value="cycles">Количество запросов</option>
                    </select>
                </div>

                {testConfig.loadType === 'rps' ? (
                    <div className="swagger-form-grid">
                        <div className="swagger-form-group">
                            <label>Запросов в секунду</label>
                            <input
                                type="number"
                                value={testConfig.rps}
                                onChange={(e) => handleConfigChange('rps', Number(e.target.value))}
                                min="1"
                                max="1000"
                                disabled={isRunning}
                            />
                        </div>
                        <div className="swagger-form-group">
                            <label>Длительность (сек)</label>
                            <input
                                type="number"
                                value={testConfig.duration}
                                onChange={(e) => handleConfigChange('duration', Number(e.target.value))}
                                min="1"
                                max="3600"
                                disabled={isRunning}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="swagger-form-group">
                        <label>Количество запросов</label>
                        <input
                            type="number"
                            value={testConfig.cycles}
                            onChange={(e) => handleConfigChange('cycles', Number(e.target.value))}
                            min="1"
                            max="100000"
                            disabled={isRunning}
                        />
                    </div>
                )}

                <div className="swagger-actions">
                    {!isRunning ? (
                        <button
                            type="button"
                            className="swagger-btn swagger-btn-primary"
                            onClick={handleStartTest}
                            disabled={!testConfig.endpoint}
                        >
                            Запустить тест
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="swagger-btn swagger-btn-danger"
                            onClick={onStopTest}
                        >
                            Остановить тест
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderResults = () => (
        <div className="swagger-load-results">
            {testResults.length === 0 ? (
                <div className="swagger-card">
                    <div className="swagger-empty-state">
                        <h3>Результаты тестов появятся здесь</h3>
                        <p>Запустите нагрузочный тест, чтобы увидеть результаты</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="swagger-results-header">
                        <h3>История тестов ({testResults.length})</h3>
                        <button
                            type="button"
                            className="swagger-btn swagger-btn-secondary"
                            onClick={onClearResults}
                        >
                            Очистить историю
                        </button>
                    </div>

                    <div className="swagger-results-list">
                        {testResults.map((result) => {
                            const successRateValue = result.totalRequests > 0
                                ? (result.successfulRequests / result.totalRequests) * 100
                                : 0;
                            const successRate = successRateValue.toFixed(1);
                            const statusClass = successRateValue >= 99 ? 'success' : successRateValue >= 95 ? 'warning' : 'error';

                            return (
                                <div key={result.id} className="swagger-card swagger-result-card">
                                    <div className="swagger-result-header">
                                        <div>
                                            <h4>
                                                {result.testType === 'scenario' ? 'Сценарий' : 'Метод'} тест
                                                <span className={`swagger-status-dot ${statusClass}`} />
                                            </h4>
                                            {result.targetLabel && (
                                                <small className="swagger-muted">{result.targetLabel}</small>
                                            )}
                                            <small>{new Date(result.timestamp).toLocaleString('ru-RU')}</small>
                                        </div>
                                    </div>

                                    <div className="swagger-result-stats">
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">Длительность</span>
                                            <span className="swagger-stat-value">
                                                {(result.duration / 1000).toFixed(1)}с
                                            </span>
                                        </div>
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">Всего запросов</span>
                                            <span className="swagger-stat-value">{result.totalRequests}</span>
                                        </div>
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">Успешных</span>
                                            <span className="swagger-stat-value swagger-success">
                                                {result.successfulRequests}
                                            </span>
                                        </div>
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">Ошибок</span>
                                            <span className="swagger-stat-value swagger-error">
                                                {result.failedRequests}
                                            </span>
                                        </div>
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">Среднее время</span>
                                            <span className="swagger-stat-value">
                                                {result.averageResponseTime.toFixed(0)}ms
                                            </span>
                                        </div>
                                        <div className="swagger-stat">
                                            <span className="swagger-stat-label">RPS</span>
                                            <span className="swagger-stat-value">
                                                {result.requestsPerSecond.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>

                                    {result.errors.length > 0 && (
                                        <div className="swagger-result-errors">
                                            <h5>Ошибки ({result.errors.length})</h5>
                                            <div className="swagger-error-list">
                                                {result.errors.slice(0, 5).map((error, errorIdx) => (
                                                    <div key={errorIdx} className="swagger-error-item">
                                                        <small>{new Date(error.timestamp).toLocaleTimeString()}</small>
                                                        <span>{error.error}</span>
                                                        {error.statusCode && (
                                                            <span className="swagger-status-code">
                                                                HTTP {error.statusCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {result.errors.length > 5 && (
                                                    <small className="swagger-muted">
                                                        ... и ещё {result.errors.length - 5} ошибок
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    const renderLiveMetrics = () => {
        if (!isRunning || !liveMetrics) return null;

        const successRate = liveMetrics.totalRequests > 0
            ? (liveMetrics.successfulRequests / liveMetrics.totalRequests * 100).toFixed(1)
            : '0.0';

        return (
            <div className="swagger-live-metrics">
                <div className="swagger-card">
                    <div className="swagger-live-header">
                        <h3>
                            <span className="swagger-pulse" />
                            Тест выполняется...
                        </h3>
                    </div>

                    <div className="swagger-metrics-grid">
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Всего запросов</span>
                            <span className="swagger-metric-value">{liveMetrics.totalRequests}</span>
                        </div>
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Успешных</span>
                            <span className="swagger-metric-value swagger-success">
                                {liveMetrics.successfulRequests}
                            </span>
                        </div>
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Ошибок</span>
                            <span className="swagger-metric-value swagger-error">
                                {liveMetrics.failedRequests}
                            </span>
                        </div>
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Успешность</span>
                            <span className="swagger-metric-value">{successRate}%</span>
                        </div>
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Среднее время</span>
                            <span className="swagger-metric-value">
                                {liveMetrics.averageResponseTime.toFixed(0)}ms
                            </span>
                        </div>
                        <div className="swagger-metric">
                            <span className="swagger-metric-label">Текущий RPS</span>
                            <span className="swagger-metric-value">
                                {liveMetrics.currentRPS.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section className="swagger-section">
            <div className="swagger-section-header">
                <h2>Нагрузочное тестирование</h2>
                <p className="swagger-muted">
                    Проверьте производительность API под нагрузкой
                </p>
            </div>

            {renderLiveMetrics()}

            <nav className="swagger-sub-tabs">
                {SUB_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`swagger-sub-tab ${activeSubTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleSubTabChange(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="swagger-tab-content">
                {activeSubTab === 'scenarios' && renderScenarios()}
                {activeSubTab === 'endpoint' && renderEndpoint()}
                {activeSubTab === 'results' && renderResults()}
            </div>
        </section>
    );
}
