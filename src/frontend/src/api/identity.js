import {identifyClient} from './client.js';
import {AUTH} from './auth.js';
import {withAuth} from '@/helpers/withAuth.js';

const group = {
    // Создать группу.
    create: (payload, config) =>
        identifyClient.post('/api/groups', payload, withAuth(config, AUTH.TRUE)),
    // Получить список активных групп.
    get: (config) =>
        identifyClient.get('/api/groups', withAuth(config, AUTH.OPTIONAL)),
    // Обновить группу.
    update: (id, payload, config) =>
        identifyClient.put(`/api/groups/${id}`, payload, withAuth(config, AUTH.TRUE)),
    // Удалить группу.
    delete: (id, config) =>
        identifyClient.delete(`/api/groups/${id}`, withAuth(config, AUTH.TRUE)),
    // Изменить активность группы.
    updateStatus: (id, isActive, config) =>
        identifyClient.put(`/api/groups/${id}/active`, isActive, withAuth(config, AUTH.TRUE)),
    // Получить студентов группы.
    getStudents: (id, config) =>
        identifyClient.get(`/api/groups/${id}/students`, withAuth(config, AUTH.TRUE)),
    // Добавить студентов в группу.
    addStudent: (id, payload, config) =>
        identifyClient.post(`/api/groups/${id}/students`, payload, withAuth(config, AUTH.TRUE)),
};

const aboutMe = {
    // Получить информацию о текущем пользователе.
    get: (config) =>
        identifyClient.get('/api/me/me', withAuth(config, AUTH.TRUE)),
    // Выбрать свою группу.
    post: (groupId, config) =>
        identifyClient.put('/api/me/group', groupId, withAuth(config, AUTH.TRUE)),
    // Удалить свою группу.
    delete: (config) =>
        identifyClient.delete('/api/me/group', withAuth(config, AUTH.TRUE)),
};

export const identifyApi = {
    group,
    aboutMe,
};

// Описание эндпоинтов identity для UI.
export const identifyApiDocs = Object.freeze([
    {service: 'identify', group: 'Groups', method: 'POST', path: '/api/groups', description: 'Создать группу.'},
    {service: 'identify', group: 'Groups', method: 'GET', path: '/api/groups', description: 'Получить список активных групп.'},
    {service: 'identify', group: 'Groups', method: 'PUT', path: '/api/groups/{id}', description: 'Обновить группу.'},
    {service: 'identify', group: 'Groups', method: 'DELETE', path: '/api/groups/{id}', description: 'Удалить группу.'},
    {service: 'identify', group: 'Groups', method: 'PUT', path: '/api/groups/{id}/active', description: 'Изменить активность группы.'},
    {service: 'identify', group: 'Groups', method: 'GET', path: '/api/groups/{id}/students', description: 'Получить студентов группы.'},
    {service: 'identify', group: 'Groups', method: 'POST', path: '/api/groups/{id}/students', description: 'Добавить студентов в группу.'},
    {service: 'identify', group: 'Me', method: 'GET', path: '/api/me/me', description: 'Получить информацию о текущем пользователе.'},
    {service: 'identify', group: 'Me', method: 'PUT', path: '/api/me/group', description: 'Выбрать свою группу.'},
    {service: 'identify', group: 'Me', method: 'DELETE', path: '/api/me/group', description: 'Удалить свою группу.'},
]);
