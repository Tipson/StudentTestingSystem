/**
 * Хук useApiRequest
 * Управляет состоянием API-запроса и его выполнением
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { apiClients } from '@api/client.js';
import { AUTH, getAccessToken } from '@api/auth.js';
import { notifyCustom } from '@shared/notifications/notificationCenter.js';
import { DEFAULT_REQUEST, DEFAULT_ENDPOINT_META } from '../constants/api.js';
import {
    makeEndpointKey,
    buildEndpointMeta,
    isSameEndpointMeta,
    buildPathLabel,
} from '../utils/swagger.js';
import { formatBodyExample } from '../utils/formatters.js';
import {
    buildDownloadFileName,
    toBlob,
    triggerDownload,
    appendFormValue,
} from '../utils/files.js';

/**
 * Хук для управления состоянием API-запроса и его выполнением
 *
 * @param {Object} options
 * @param {Array} options.serviceEntries - Доступные сервисы
 * @param {Array} options.serviceGroups - Эндпоинты, сгруппированные по сервисам
 * @returns {Object} Состояние запроса и обработчики
 */
export default function useApiRequest({ serviceEntries = [], serviceGroups = [] }) {
    const [request, setRequest] = useState(() => ({
        ...DEFAULT_REQUEST,
        service: serviceEntries[0]?.key || DEFAULT_REQUEST.service,
    }));
    const [response, setResponse] = useState(null);
    const [showResponse, setShowResponse] = useState(false);
    const [pending, setPending] = useState(false);
    const [endpointMeta, setEndpointMeta] = useState(DEFAULT_ENDPOINT_META);
    const [uploadFiles, setUploadFiles] = useState([]);

    const lastAppliedKeyRef = useRef('');

    // Формируем варианты путей для текущих service/method
    const pathOptions = useMemo(() => {
        const options = [];

        serviceGroups.forEach((service) => {
            if (service.serviceKey !== request.service) return;

            service.groups.forEach((group) => {
                const groupTitle = group.title || 'General';

                group.items.forEach((item) => {
                    if (item.method !== request.method) return;

                    options.push({
                        value: item.path,
                        label: buildPathLabel(item, groupTitle),
                        item,
                    });
                });
            });
        });

        const unique = new Map();
        options.forEach((option) => {
            if (!unique.has(option.value)) {
                unique.set(option.value, option);
            }
        });

        return Array.from(unique.values()).sort((a, b) => a.value.localeCompare(b.value));
    }, [request.method, request.service, serviceGroups]);

    // Применяем выбранный эндпоинт
    const applyEndpoint = useCallback((item, serviceKey) => {
        const nextBody = item.example != null
            ? formatBodyExample(item.example)
            : item.hasRequestBody
                ? ''
                : '';
        const nextMeta = buildEndpointMeta(item);
        const nextKey = makeEndpointKey(serviceKey, item.method, item.path);

        setEndpointMeta(nextMeta);
        setUploadFiles([]);
        lastAppliedKeyRef.current = nextKey;

        setRequest((prev) => ({
            ...prev,
            service: serviceKey,
            method: item.method,
            path: item.path,
            auth: item.auth ?? prev.auth,
            body: nextBody,
        }));
    }, []);

    // Синхронизация path и метаданных при смене service/method
    useEffect(() => {
        if (!request.path) {
            lastAppliedKeyRef.current = '';
            setEndpointMeta((prev) => (
                isSameEndpointMeta(prev, DEFAULT_ENDPOINT_META) ? prev : DEFAULT_ENDPOINT_META
            ));
            return;
        }

        const matched = pathOptions.find((option) => option.value === request.path);

        if (!matched) {
            lastAppliedKeyRef.current = '';
            setEndpointMeta((prev) => (
                isSameEndpointMeta(prev, DEFAULT_ENDPOINT_META) ? prev : DEFAULT_ENDPOINT_META
            ));
            setUploadFiles([]);
            setRequest((prev) => ({ ...prev, path: '', body: '' }));
            return;
        }

        const nextKey = makeEndpointKey(request.service, request.method, request.path);
        if (lastAppliedKeyRef.current === nextKey) return;

        lastAppliedKeyRef.current = nextKey;
        applyEndpoint(matched.item, request.service);
    }, [applyEndpoint, pathOptions, request.method, request.path, request.service]);

    // Обработка изменения поля формы
    const handleFieldChange = useCallback((field, value) => {
        setRequest((prev) => ({ ...prev, [field]: value }));
    }, []);

    // Обработка выбора файлов
    const handleFileSelect = useCallback((files) => {
        setUploadFiles(Array.from(files));
    }, []);

    // Очистка выбранных файлов
    const clearFiles = useCallback(() => {
        setUploadFiles([]);
    }, []);

    // Выполнение API-запроса
    const handleSend = useCallback(async () => {
        if (pending) return;

        const client = apiClients[request.service];
        if (!client) {
            notifyCustom({ type: 'error', message: `Сервис "${request.service}" не найден` });
            return;
        }

        setPending(true);
        setShowResponse(true);

        try {
            const config = {
                method: request.method,
                url: request.path,
            };

            // Добавляем заголовок авторизации при необходимости
            if (request.auth === AUTH.TRUE || request.auth === AUTH.OPTIONAL) {
                const token = await getAccessToken(request.auth === AUTH.OPTIONAL);
                if (token) {
                    config.headers = { Authorization: `Bearer ${token}` };
                }
            }

            // Обработка загрузки файлов
            if (endpointMeta.upload && uploadFiles.length > 0) {
                const formData = new FormData();
                uploadFiles.forEach((file) => {
                    formData.append(endpointMeta.uploadField, file);
                });

                // Добавляем поля тела запроса в form-data
                if (request.body) {
                    try {
                        const bodyObj = JSON.parse(request.body);
                        Object.entries(bodyObj).forEach(([key, value]) => {
                            appendFormValue(formData, key, value);
                        });
                    } catch {
                        // Тело запроса не JSON — пропускаем
                    }
                }

                config.data = formData;
            } else if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
                try {
                    config.data = JSON.parse(request.body);
                } catch {
                    config.data = request.body;
                }
            }

            // Для скачивания ожидаем blob-ответ
            if (endpointMeta.download) {
                config.responseType = 'blob';
            }

            const result = await client.request(config);

            // Если нужно скачать файл — инициируем скачивание
            if (endpointMeta.download && result.data instanceof Blob) {
                const fileName = buildDownloadFileName(result.headers, request.path);
                triggerDownload(result.data, fileName);
            }

            setResponse(result);
            notifyCustom({ type: 'success', message: `${request.method} ${request.path}: ${result.status}` });
        } catch (error) {
            setResponse(error.response || {
                status: 0,
                data: { message: error.message },
            });
            const status = error.response?.status || 'Ошибка';
            notifyCustom({ type: 'error', message: `${request.method} ${request.path}: ${status}` });
        } finally {
            setPending(false);
        }
    }, [pending, request, endpointMeta, uploadFiles]);

    // Сброс состояния запроса
    const resetRequest = useCallback(() => {
        setRequest({
            ...DEFAULT_REQUEST,
            service: serviceEntries[0]?.key || DEFAULT_REQUEST.service,
        });
        setResponse(null);
        setShowResponse(false);
        setUploadFiles([]);
        setEndpointMeta(DEFAULT_ENDPOINT_META);
        lastAppliedKeyRef.current = '';
    }, [serviceEntries]);

    return {
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
    };
}
