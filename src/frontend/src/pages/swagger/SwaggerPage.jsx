import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getAccessToken} from '@api/auth.js';
import {notifyCustom} from '@shared/notifications/notificationCenter.js';
import {clearStoredTokens, startKeycloakLogin} from '@shared/auth/keycloak.js';
import {useUser} from '@shared/auth/UserProvider.jsx';

import {
    useSwagger,
    useApiRequest,
    useProfile,
    useAutoTests,
    useScenarios,
} from './hooks';

import {
    ConsoleTab,
    TestsTab,
    ScenariosTab,
    ProfileTab,
} from './components';

import {
    runAutoTestsSuite,
    runScenarioById,
} from './services';

import {SCENARIO_DEFINITIONS} from './constants';

import './SwaggerPage.css';

const TABS = [
    {key: 'console', label: 'Консоль'},
    {key: 'tests', label: 'Тесты'},
    {key: 'scenarios', label: 'Сценарии'},
    {key: 'profile', label: 'Профиль'},
];

export default function SwaggerPage() {
    const {profile, roles, source, refreshProfile} = useUser();
    const [activeTab, setActiveTab] = useState('console');

    const {
        swaggerGroups,
        swaggerLoading,
        swaggerErrors,
        serviceEntries,
        serviceGroups,
        loadSwagger,
    } = useSwagger();

    const {
        request,
        response,
        showResponse,
        pending,
        endpointMeta,
        uploadFiles,
        pathOptions,
        handleFieldChange,
        handleFileSelect,
        clearFiles,
        handleSend,
        resetRequest,
        applyEndpoint,
        setShowResponse,
    } = useApiRequest({serviceEntries, serviceGroups});

    const {
        tokens,
        hasToken,
        tokenLabel,
        tokenPreview,
        tokenExpiresAt,
        refreshTokens,
        accountProfile,
        accountProfileLoading,
        accountProfileError,
        loadAccountProfile,
        accountSecurityLoading,
        accountSecurityError,
        accountSessions,
        accountCredentials,
        loadSecurityInfo,
        profileForm,
        profileSaving,
        profileDirty,
        handleProfileFormChange,
        handleProfileSave,
        otpData,
        otpLoading,
        otpError,
        otpForm,
        otpSaving,
        loadOtpSetup,
        handleOtpFormChange,
        handleOtpSave,
        handleLogoutSession,
        handleLogoutAllSessions,
        handleDeleteCredential,
        keycloakAccountUrl,
        keycloakSecurityUrl,
        profileTabLoadedRef,
    } = useProfile();

    const {
        autoTestRunning,
        autoTestResults,
        autoTestView,
        expandedAutoTestRows,
        autoTestAutoExpand,
        setAutoTestView,
        setAutoTestAutoExpand,
        toggleAutoTestRow,
        autoTestExpectedTotal,
        autoTestCompleted,
        autoTestRemaining,
        autoTestProgress,
        autoTestSummary,
        autoTestByStatus,
        groupedAutoTests,
        autoTestViews,
        statusSegments,
        qualitySegments,
        coverageSegments,
        statusSuccessRate,
        qualitySuccessRate,
        coverageRate,
        executedTotal,
        pushResult: pushAutoTestResult,
        clearResults: clearAutoTestResults,
        startTestRun,
        endTestRun,
        setAutoTestRunning,
    } = useAutoTests({serviceGroups});

    const {
        scenarioRunning,
        scenarioResults,
        activeScenarioId,
        selectedScenarioId,
        expandedScenarioRows,
        expandedScenarioSteps,
        scenarioAutoExpand,
        setScenarioAutoExpand,
        toggleScenarioRow,
        toggleScenarioStep,
        selectScenario,
        pushResult: pushScenarioResult,
        clearResults: clearScenarioResults,
        startScenario,
        endScenario,
        setScenarioRunning,
    } = useScenarios();

    const autoTestStopRef = useRef(false);
    const scenarioStopRef = useRef(false);

    // загрузка сваггера
    useEffect(() => {
        loadSwagger();
    }, [loadSwagger]);

    // загрузка профиля на вкладке профиля
    useEffect(() => {
        if (activeTab === 'profile' && hasToken && !profileTabLoadedRef.current) {
            profileTabLoadedRef.current = true;
            loadAccountProfile();
            loadSecurityInfo();
        }
    }, [activeTab, hasToken, loadAccountProfile, loadSecurityInfo, profileTabLoadedRef]);

    // Авторизация
    const handleLogin = useCallback(() => {
        startKeycloakLogin();
    }, []);

    const handleLogout = useCallback(() => {
        clearStoredTokens();
        refreshTokens();
        refreshProfile();
        notifyCustom({type: 'info', message: 'Выход выполнен'});
    }, [refreshTokens, refreshProfile]);

    const handleRefreshToken = useCallback(async () => {
        try {
            await getAccessToken(false, true);
            refreshTokens();
            notifyCustom({type: 'success', message: 'Токен обновлён'});
        } catch (error) {
            notifyCustom({type: 'error', message: 'Ошибка обновления токена'});
        }
    }, [refreshTokens]);

    const handleCopyToken = useCallback(() => {
        if (tokens?.accessToken) {
            navigator.clipboard.writeText(tokens.accessToken);
            notifyCustom({type: 'success', message: 'Токен скопирован'});
        }
    }, [tokens]);

    // обновление формы профиля
    const handleProfileReset = useCallback(() => {
        if (accountProfile) {
            handleProfileFormChange('username', accountProfile.username || '');
            handleProfileFormChange('email', accountProfile.email || '');
            handleProfileFormChange('firstName', accountProfile.firstName || '');
            handleProfileFormChange('lastName', accountProfile.lastName || '');
        }
    }, [accountProfile, handleProfileFormChange]);

    // Обновление формы OTP
    const handleOtpReset = useCallback(() => {
        handleOtpFormChange('code', '');
        handleOtpFormChange('deviceName', '');
    }, [handleOtpFormChange]);

    // Запуск авто-тестов
    const runAutoTests = useCallback(async () => {
        if (autoTestRunning) return;

        autoTestStopRef.current = false;
        startTestRun();

        try {
            await runAutoTestsSuite({
                onResult: pushAutoTestResult,
                stopRef: autoTestStopRef,
            });
            notifyCustom({type: 'success', message: 'Автотесты завершены'});
        } catch (error) {
            if (!autoTestStopRef.current) {
                notifyCustom({type: 'error', message: `Автотесты прерваны: ${error.message}`});
            }
        } finally {
            endTestRun();
        }
    }, [autoTestRunning, startTestRun, endTestRun, pushAutoTestResult]);

    // Стоп тестов
    const stopAutoTests = useCallback(() => {
        autoTestStopRef.current = true;
        setAutoTestRunning(false);
        notifyCustom({type: 'info', message: 'Автотесты остановлены'});
    }, [setAutoTestRunning]);

    // Запуск сценариев
    const runScenario = useCallback(async (scenarioId) => {
        if (scenarioRunning) return;

        const scenario = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);
        if (!scenario) {
            notifyCustom({type: 'error', message: 'Сценарий не найден'});
            return;
        }

        scenarioStopRef.current = false;
        startScenario(scenarioId);

        try {
            await runScenarioById(scenarioId, {
                onResult: pushScenarioResult,
                stopRef: scenarioStopRef,
            });
            notifyCustom({type: 'success', message: `Сценарий "${scenario.title}" завершён`});
        } catch (error) {
            if (!scenarioStopRef.current) {
                notifyCustom({type: 'error', message: `Сценарий прерван: ${error.message}`});
            }
        } finally {
            endScenario();
        }
    }, [scenarioRunning, startScenario, endScenario, pushScenarioResult]);

    // Остановка сценариев
    const stopScenario = useCallback(() => {
        scenarioStopRef.current = true;
        setScenarioRunning(false);
        notifyCustom({type: 'info', message: 'Сценарий остановлен'});
    }, [setScenarioRunning]);

    // Выбор ендпоинта
    const handleSelectEndpoint = useCallback((item, serviceKey) => {
        applyEndpoint(item, serviceKey);
    }, [applyEndpoint]);

    return (
        <main className="swagger-shell">
            <section className="swagger-hero">
                <div className="swagger-title">
                    <span className="swagger-eyebrow">API Testing</span>
                    <h1>API Console</h1>
                    <p className="swagger-subtitle">
                        Интерфейс для тестирования API, автотестов и управления профилем
                    </p>
                    <nav className="swagger-tabs">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`swagger-tab ${activeTab === tab.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </section>

            {activeTab === 'console' && (
                <ConsoleTab
                    request={request}
                    response={response}
                    showResponse={showResponse}
                    pending={pending}
                    endpointMeta={endpointMeta}
                    uploadFiles={uploadFiles}
                    pathOptions={pathOptions}
                    serviceEntries={serviceEntries}
                    serviceGroups={serviceGroups}
                    swaggerLoading={swaggerLoading}
                    swaggerErrors={swaggerErrors}
                    onFieldChange={handleFieldChange}
                    onFileSelect={handleFileSelect}
                    onClearFiles={clearFiles}
                    onSend={handleSend}
                    onReset={resetRequest}
                    onCloseResponse={() => setShowResponse(false)}
                    onSelectEndpoint={handleSelectEndpoint}
                    onLoadSwagger={loadSwagger}
                />
            )}

            {activeTab === 'tests' && (
                <TestsTab
                    autoTestRunning={autoTestRunning}
                    autoTestResults={autoTestResults}
                    autoTestView={autoTestView}
                    expandedAutoTestRows={expandedAutoTestRows}
                    autoTestAutoExpand={autoTestAutoExpand}
                    autoTestExpectedTotal={autoTestExpectedTotal}
                    autoTestCompleted={autoTestCompleted}
                    autoTestRemaining={autoTestRemaining}
                    autoTestProgress={autoTestProgress}
                    autoTestSummary={autoTestSummary}
                    autoTestByStatus={autoTestByStatus}
                    groupedAutoTests={groupedAutoTests}
                    autoTestViews={autoTestViews}
                    statusSegments={statusSegments}
                    qualitySegments={qualitySegments}
                    coverageSegments={coverageSegments}
                    statusSuccessRate={statusSuccessRate}
                    qualitySuccessRate={qualitySuccessRate}
                    coverageRate={coverageRate}
                    executedTotal={executedTotal}
                    onRunTests={runAutoTests}
                    onStopTests={stopAutoTests}
                    onClearResults={clearAutoTestResults}
                    onViewChange={setAutoTestView}
                    onAutoExpandChange={setAutoTestAutoExpand}
                    onToggleRow={toggleAutoTestRow}
                />
            )}

            {activeTab === 'scenarios' && (
                <ScenariosTab
                    scenarioRunning={scenarioRunning}
                    scenarioResults={scenarioResults}
                    activeScenarioId={activeScenarioId}
                    selectedScenarioId={selectedScenarioId}
                    expandedScenarioRows={expandedScenarioRows}
                    expandedScenarioSteps={expandedScenarioSteps}
                    scenarioAutoExpand={scenarioAutoExpand}
                    onRunScenario={runScenario}
                    onStopScenario={stopScenario}
                    onClearResults={clearScenarioResults}
                    onSelectScenario={selectScenario}
                    onToggleRow={toggleScenarioRow}
                    onToggleStep={toggleScenarioStep}
                    onAutoExpandChange={setScenarioAutoExpand}
                />
            )}

            {activeTab === 'profile' && (
                <ProfileTab
                    profile={profile}
                    roles={roles}
                    source={source}
                    hasToken={hasToken}
                    tokens={tokens}
                    keycloakAccountUrl={keycloakAccountUrl}
                    keycloakSecurityUrl={keycloakSecurityUrl}
                    accountProfile={accountProfile}
                    accountProfileLoading={accountProfileLoading}
                    accountProfileError={accountProfileError}
                    profileForm={profileForm}
                    profileDirty={profileDirty}
                    profileSaving={profileSaving}
                    onProfileChange={handleProfileFormChange}
                    onProfileSave={handleProfileSave}
                    onProfileReset={handleProfileReset}
                    onProfileRefresh={loadAccountProfile}
                    accountSecurityLoading={accountSecurityLoading}
                    accountSecurityError={accountSecurityError}
                    accountSessions={accountSessions}
                    accountCredentials={accountCredentials}
                    onSecurityRefresh={loadSecurityInfo}
                    onLogoutSession={handleLogoutSession}
                    onLogoutAllSessions={handleLogoutAllSessions}
                    onRemoveCredential={handleDeleteCredential}
                    otpData={otpData}
                    otpLoading={otpLoading}
                    otpError={otpError}
                    otpForm={otpForm}
                    otpSaving={otpSaving}
                    onOtpChange={handleOtpFormChange}
                    onOtpLoad={loadOtpSetup}
                    onOtpSave={handleOtpSave}
                    onOtpReset={handleOtpReset}
                    tokenLabel={tokenLabel}
                    tokenPreview={tokenPreview}
                    tokenExpiresAt={tokenExpiresAt}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onRefreshToken={handleRefreshToken}
                    onCopyToken={handleCopyToken}
                />
            )}
        </main>
    );
}
