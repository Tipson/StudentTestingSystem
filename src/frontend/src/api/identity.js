import {identifyClient} from './client.js';
import {AUTH} from './auth.js';
import {withAuth} from '@/helpers/withAuth.js';

const group = {
    create: (payload, config) =>
        identifyClient.post('/api/groups', payload, withAuth(config, AUTH.TRUE)),
    get: (payload, config) =>
        identifyClient.get('/api/groups', payload, withAuth(config, AUTH.TRUE)),
    update: (payload, config, id) =>
        identifyClient.put(`/api/groups/${id}`,payload, withAuth(config, AUTH.TRUE)),
    delete: (payload, config, id) =>
        identifyClient.delete(`/api/groups/${id}`,payload, withAuth(config, AUTH.TRUE)),
    updateStatus: (payload, config, id) =>
        identifyClient.put(`/api/groups/${id}/active`, payload, withAuth(config, AUTH.TRUE)),
    getStudents: (config, id) =>
        identifyClient.get(`/api/groups/${id}/students`, withAuth(config, AUTH.TRUE)),
    addStudent: (payload, config, id) =>
        identifyClient.post(`/api/groups/${id}/students`.payload, withAuth(config, AUTH.TRUE)),
}

const aboutMe = {
    get: (payload, config) => // Получить информацию о пользователе
        identifyClient.get('/api/me',withAuth(config, AUTH.TRUE)),
    post: (payload, config) => // Вступить в группу
        identifyClient.post('/api/me/group', payload, withAuth(config, AUTH.TRUE)),
    delete: (payload, config) => // Выйти из группы
        identifyClient.delete('/api/me/group', payload, withAuth(config, AUTH.TRUE)),
}

export const identifyApi = {
    group,
    aboutMe,
}