/**
 * Компонент ConsoleTab
 * Конструктор API-запросов и просмотрщик ответов
 */
import React, { useMemo } from 'react';
import { METHODS, AUTH_OPTIONS } from '../../constants/index.js';
import { formatResponse, formatSelectedFiles } from '../../utils/index.js';

/**
 * Компонент списка эндпоинтов
 */
function EndpointList({
                          serviceGroups,
                          swaggerLoading,
                          swaggerErrors,
                          onSelectEndpoint,
                          onLoadSwagger,
                      }) {
    return (
        <div className="swagger-panel swagger-endpoints-panel">
            <div className="swagger-tests-header">
                <h2>Эндпоинты API</h2>
                <div className="swagger-tests-controls">
                    <button
                        className="swagger-button secondary"
                        type="button"
                        onClick={onLoadSwagger}
                        disabled={swaggerLoading}
                    >
                        {swaggerLoading ? 'Загрузка...' : 'Обновить'}
                    </button>
                </div>
            </div>

            {swaggerErrors.length > 0 && (
                <div className="swagger-errors">
                    {swaggerErrors.map((error, index) => (
                        <p key={index} className="swagger-error">
                            {error.service}: {error.message}
                        </p>
                    ))}
                </div>
            )}

            {swaggerLoading ? (
                <p className="swagger-subtitle swagger-loading">Загружаем Swagger...</p>
            ) : (
                <div className="swagger-endpoint-tree">
                    {serviceGroups.map((service) => (
                        <div key={service.serviceKey} className="swagger-endpoint-service">
                            <h3 className="swagger-endpoint-service-title">
                                {service.serviceTitle}
                            </h3>
                            {service.groups.map((group) => (
                                <div key={group.title} className="swagger-endpoint-group">
                                    <h4 className="swagger-endpoint-group-title">
                                        {group.title}
                                    </h4>
                                    <div className="swagger-endpoint-list">
                                        {group.items.map((item, index) => (
                                            <button
                                                key={`${item.method}-${item.path}-${index}`}
                                                type="button"
                                                className="swagger-endpoint-item"
                                                onClick={() => onSelectEndpoint(item, service.serviceKey)}
                                            >
                                                <span className={`swagger-method swagger-method-${item.method.toLowerCase()}`}>
                                                    {item.method}
                                                </span>
                                                <span className="swagger-endpoint-path">{item.path}</span>
                                                {item.description && (
                                                    <span className="swagger-endpoint-desc">
                                                        {item.description}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Компонент конструктора запроса
 */
function RequestBuilder({
                            request,
                            serviceEntries,
                            pathOptions,
                            endpointMeta,
                            uploadFiles,
                            pending,
                            onFieldChange,
                            onFileSelect,
                            onClearFiles,
                            onSend,
                            onReset,
                        }) {
    const handleInputChange = (field) => (e) => {
        onFieldChange(field, e.target.value);
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            onFileSelect(e.target.files);
        }
    };

    const selectedFilesLabel = useMemo(
        () => formatSelectedFiles(uploadFiles),
        [uploadFiles],
    );

    return (
        <div className="swagger-panel swagger-request-panel">
            <div className="swagger-tests-header">
                <h2>Конструктор запроса</h2>
                <div className="swagger-tests-controls">
                    <button
                        className="swagger-button ghost"
                        type="button"
                        onClick={onReset}
                        disabled={pending}
                    >
                        Сбросить
                    </button>
                </div>
            </div>

            <div className="swagger-form-grid swagger-form-4col">
                {/* Сервис */}
                <div className="swagger-field">
                    <label htmlFor="req-service">Сервис</label>
                    <select
                        id="req-service"
                        className="swagger-select"
                        value={request.service}
                        onChange={handleInputChange('service')}
                        disabled={pending}
                    >
                        {serviceEntries.map((entry) => (
                            <option key={entry.key} value={entry.key}>
                                {entry.key}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Метод */}
                <div className="swagger-field">
                    <label htmlFor="req-method">Метод</label>
                    <select
                        id="req-method"
                        className="swagger-select"
                        value={request.method}
                        onChange={handleInputChange('method')}
                        disabled={pending}
                    >
                        {METHODS.map((method) => (
                            <option key={method} value={method}>
                                {method}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Путь */}
                <div className="swagger-field swagger-field-2x">
                    <label htmlFor="req-path">Путь</label>
                    <input
                        id="req-path"
                        className="swagger-input"
                        type="text"
                        list="path-options"
                        value={request.path}
                        onChange={handleInputChange('path')}
                        placeholder="/api/..."
                        disabled={pending}
                    />
                    <datalist id="path-options">
                        {pathOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </datalist>
                </div>

                {/* Авторизация */}
                <div className="swagger-field">
                    <label htmlFor="req-auth">Авторизация</label>
                    <select
                        id="req-auth"
                        className="swagger-select"
                        value={request.auth}
                        onChange={handleInputChange('auth')}
                        disabled={pending}
                    >
                        {AUTH_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Тело */}
            <div className="swagger-field">
                <label htmlFor="req-body">Тело запроса (JSON)</label>
                <textarea
                    id="req-body"
                    className="swagger-textarea"
                    rows={6}
                    value={request.body}
                    onChange={handleInputChange('body')}
                    placeholder='{"key": "value"}'
                    disabled={pending}
                />
            </div>

            {/* Загрузка файлов */}
            {endpointMeta.upload && (
                <div className="swagger-field">
                    <label htmlFor="req-files">
                        Файлы ({endpointMeta.uploadField})
                        {endpointMeta.uploadRequired && <span className="swagger-required"> *</span>}
                    </label>
                    <div className="swagger-file-input">
                        <input
                            id="req-files"
                            type="file"
                            multiple={endpointMeta.uploadMultiple}
                            onChange={handleFileChange}
                            disabled={pending}
                        />
                        {uploadFiles.length > 0 && (
                            <div className="swagger-file-selected">
                                <span>{selectedFilesLabel}</span>
                                <button
                                    type="button"
                                    className="swagger-button ghost"
                                    onClick={onClearFiles}
                                >
                                    Очистить
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Отправка */}
            <div className="swagger-form-actions">
                <button
                    className="swagger-button"
                    type="button"
                    onClick={onSend}
                    disabled={pending || !request.path}
                >
                    {pending ? 'Отправка...' : 'Отправить'}
                </button>
            </div>
        </div>
    );
}

/**
 * Компонент просмотра ответа
 */
function ResponseViewer({
                            response,
                            showResponse,
                            onClose,
                        }) {
    if (!showResponse || !response) {
        return null;
    }

    const isSuccess = response.status >= 200 && response.status < 300;
    const statusClass = isSuccess ? 'swagger-response-success' : 'swagger-response-error';
    const formattedResponse = formatResponse(response);

    return (
        <div className="swagger-panel swagger-response-panel">
            <div className="swagger-tests-header">
                <h2>Ответ</h2>
                <div className="swagger-tests-controls">
                    <span className={`swagger-response-status ${statusClass}`}>
                        {response.status}
                    </span>
                    <button
                        className="swagger-button ghost"
                        type="button"
                        onClick={onClose}
                    >
                        Скрыть
                    </button>
                </div>
            </div>
            <pre className="swagger-response-body">
                {formattedResponse || 'Пустой ответ'}
            </pre>
        </div>
    );
}

export default function ConsoleTab({
                                       // Состояние запроса
                                       request,
                                       response,
                                       showResponse,
                                       pending,
                                       endpointMeta,
                                       uploadFiles,
                                       pathOptions,
                                       // Состояние Swagger
                                       serviceEntries,
                                       serviceGroups,
                                       swaggerLoading,
                                       swaggerErrors,
                                       // Обработчики
                                       onFieldChange,
                                       onFileSelect,
                                       onClearFiles,
                                       onSend,
                                       onReset,
                                       onCloseResponse,
                                       onSelectEndpoint,
                                       onLoadSwagger,
                                   }) {
    return (
        <section className="swagger-console">
            <div className="swagger-console-grid">
                {/* Слева: список эндпоинтов */}
                <EndpointList
                    serviceGroups={serviceGroups}
                    swaggerLoading={swaggerLoading}
                    swaggerErrors={swaggerErrors}
                    onSelectEndpoint={onSelectEndpoint}
                    onLoadSwagger={onLoadSwagger}
                />

                {/* Справа: конструктор запроса и ответ */}
                <div className="swagger-console-main">
                    <RequestBuilder
                        request={request}
                        serviceEntries={serviceEntries}
                        pathOptions={pathOptions}
                        endpointMeta={endpointMeta}
                        uploadFiles={uploadFiles}
                        pending={pending}
                        onFieldChange={onFieldChange}
                        onFileSelect={onFileSelect}
                        onClearFiles={onClearFiles}
                        onSend={onSend}
                        onReset={onReset}
                    />
                    <ResponseViewer
                        response={response}
                        showResponse={showResponse}
                        onClose={onCloseResponse}
                    />
                </div>
            </div>
        </section>
    );
}
