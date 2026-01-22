/**
 * Хук useSwaggerData
 * Управляет загрузкой Swagger-документации и группировкой эндпоинтов
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URLS } from '@api/config.js';
import { buildSwaggerGroups, normalizeBaseUrl, getSwaggerUrl } from '../utils/swagger.js';
import { FALLBACK_ENDPOINT_GROUPS, API_DOCS_MAP } from '../constants/endpoints.js';
import { DEFAULT_REQUEST } from '../constants/api.js';

/**
 * Хук для загрузки Swagger-документации и управления данными
 * @returns {Object} Swagger-данные и состояние загрузки
 */
export default function useSwaggerData() {
    const [swaggerGroups, setSwaggerGroups] = useState([]);
    const [swaggerLoading, setSwaggerLoading] = useState(false);
    const [swaggerErrors, setSwaggerErrors] = useState([]);

    // Формируем список сервисов из API_BASE_URLS
    const serviceEntries = useMemo(
        () => Object.entries(API_BASE_URLS)
            .filter(([, url]) => Boolean(url))
            .map(([key, url]) => ({ key, url })),
        [],
    );

    // Убираем дубликаты источников Swagger по base URL
    const swaggerSources = useMemo(() => {
        const unique = new Map();

        serviceEntries.forEach((entry) => {
            const normalized = normalizeBaseUrl(entry.url);
            if (!normalized) return;

            if (!unique.has(normalized)) {
                unique.set(normalized, { key: entry.key, url: normalized });
            }
        });

        return Array.from(unique.values());
    }, [serviceEntries]);

    // Загружаем Swagger-документацию
    const loadSwagger = useCallback(async () => {
        if (swaggerLoading) return;

        setSwaggerLoading(true);
        setSwaggerErrors([]);

        const newGroups = [];
        const errors = [];

        await Promise.all(
            swaggerSources.map(async ({ key, url }) => {
                const swaggerUrl = getSwaggerUrl(url);
                if (!swaggerUrl) return;

                try {
                    const response = await axios.get(swaggerUrl, { timeout: 10000 });
                    const groups = buildSwaggerGroups(response.data, key, API_DOCS_MAP);
                    newGroups.push(...groups);
                } catch (error) {
                    const message =
                        error.response?.data?.message || error.message || 'Ошибка загрузки';
                    errors.push({ service: key, url: swaggerUrl, message });
                }
            }),
        );

        setSwaggerGroups(newGroups);
        setSwaggerErrors(errors);
        setSwaggerLoading(false);
    }, [swaggerSources, swaggerLoading]);

    // Автозагрузка при первом монтировании
    useEffect(() => {
        if (swaggerGroups.length === 0 && !swaggerLoading) {
            loadSwagger();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Если Swagger не загрузился — используем резервные группы
    const endpointGroups = swaggerGroups.length ? swaggerGroups : FALLBACK_ENDPOINT_GROUPS;

    // Группируем эндпоинты по сервисам
    const serviceGroups = useMemo(() => {
        const grouped = new Map();

        endpointGroups.forEach((group) => {
            const serviceKey = group.service || DEFAULT_REQUEST.service;
            const serviceTitle = group.serviceTitle || serviceKey;
            const groupTitle = group.title || 'General';

            if (!grouped.has(serviceKey)) {
                grouped.set(serviceKey, {
                    serviceKey,
                    serviceTitle,
                    groups: [],
                });
            }

            grouped.get(serviceKey).groups.push({
                ...group,
                title: groupTitle,
                service: serviceKey,
                serviceTitle,
            });
        });

        return Array.from(grouped.values())
            .map((service) => ({
                ...service,
                groups: service.groups.sort((a, b) => a.title.localeCompare(b.title)),
            }))
            .sort((a, b) => a.serviceTitle.localeCompare(b.serviceTitle));
    }, [endpointGroups]);

    return {
        swaggerGroups,
        swaggerLoading,
        swaggerErrors,
        loadSwagger,
        endpointGroups,
        serviceGroups,
        serviceEntries,
        swaggerSources,
    };
}
