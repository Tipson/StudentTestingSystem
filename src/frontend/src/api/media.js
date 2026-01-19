import {mediaClient} from './client.js';
import {AUTH} from './auth.js';
import {withAuth} from '@/helpers/withAuth.js';

// Эндпоинты для работы с файлами.
const files = {
    // Загрузить файлы.
    create: (payload, config) =>
        mediaClient.post('/api/files/upload', payload, withAuth(config, AUTH.TRUE)),
    // Получить метаданные файлов.
    get: (payload, config) =>
        mediaClient.post('/api/files/get', payload, withAuth(config, AUTH.TRUE)),
    // Скачать файлы.
    download: (payload, config) =>
        mediaClient.post('/api/files/download', payload, withAuth(config, AUTH.OPTIONAL)),
    // Получить свои файлы.
    getMy: (config) =>
        mediaClient.get('/api/files/my', withAuth(config, AUTH.TRUE)),
    // Удалить файлы.
    delete: (payload, config) =>
        mediaClient.post('/api/files/delete', payload, withAuth(config, AUTH.TRUE)),
};

export const mediaApi = {
    files,
};
