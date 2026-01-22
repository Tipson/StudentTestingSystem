/**
 * Утилиты для работы с файлами (загрузка/скачивание)
 */

/**
 * Парсит имя файла из заголовка Content-Disposition
 * @param {string} value - Значение заголовка
 * @returns {string} Извлечённое имя файла
 */
export const parseContentDispositionFileName = (value) => {
    if (!value) return '';

    const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        const rawValue = utfMatch[1].replace(/"/g, '');
        try {
            return decodeURIComponent(rawValue);
        } catch (error) {
            return rawValue;
        }
    }

    const match = value.match(/filename="?([^";]+)"?/i);
    return match?.[1] || '';
};

/**
 * Формирует имя файла для скачивания из заголовков или пути
 * @param {Object} headers - Заголовки ответа
 * @param {string} path - Путь API
 * @returns {string} Имя файла для скачивания
 */
export const buildDownloadFileName = (headers, path) => {
    const rawHeader = headers?.['content-disposition'] || headers?.['Content-Disposition'];
    const fileName = parseContentDispositionFileName(rawHeader);
    if (fileName) return fileName;

    const pathTail = path?.split('/').filter(Boolean).pop();
    return pathTail || `download-${Date.now()}`;
};

/**
 * Преобразует данные в Blob
 * @param {*} data - Данные ответа
 * @param {Object} headers - Заголовки ответа
 * @returns {Blob} Blob-объект
 */
export const toBlob = (data, headers) => {
    if (data instanceof Blob) return data;

    const contentType = headers?.['content-type'] || 'application/octet-stream';
    return new Blob([data], { type: contentType });
};

/**
 * Инициирует скачивание файла в браузере
 * @param {Blob} blob - Blob файла
 * @param {string} fileName - Имя файла для скачивания
 */
export const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName || `download-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

/**
 * Добавляет значение в FormData (поддерживает массивы и объекты)
 * @param {FormData} formData - Объект FormData
 * @param {string} key - Ключ поля
 * @param {*} value - Значение для добавления
 */
export const appendFormValue = (formData, key, value) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
        value.forEach((item) => appendFormValue(formData, key, item));
        return;
    }

    if (value instanceof Blob) {
        formData.append(key, value);
        return;
    }

    if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
    }

    formData.append(key, String(value));
};
