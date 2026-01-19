import {AUTH, getAccessToken} from './auth.js';
import {notifyError} from '@shared/notifications/notificationCenter.js';

// Axios-мидлвар, который добавляет Authorization в зависимости от флага auth.
export const applyAuthMiddleware = (client) => {
    client.interceptors.request.use((config) => {
        const authMode = config.auth ?? AUTH.TRUE;
        const token = getAccessToken();

        // Удаляем пользовательский флаг, чтобы он не попадал внутрь axios.
        if ('auth' in config) {
            delete config.auth;
        }

        const headers = config.headers ?? {};

        if (authMode === AUTH.FALSE) {
            if (typeof headers.delete === 'function') {
                headers.delete('Authorization');
            } else if (headers.Authorization) {
                delete headers.Authorization;
            }
            config.headers = headers;
            return config;
        }

        if (!token) {
            if (authMode === AUTH.TRUE) {
                return Promise.reject(new Error('Авторизация обязательна для этого запроса'));
            }
            return config;
        }

        if (typeof headers.set === 'function') {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            headers.Authorization = `Bearer ${token}`;
        }

        config.headers = headers;
        return config;
    });

    client.interceptors.response.use(
        (response) => response,
        (error) => {
            const shouldNotify = !error?.config?.silentError;
            const isCanceled = error?.code === 'ERR_CANCELED';

            if (shouldNotify && !isCanceled) {
                notifyError(error);
            }

            return Promise.reject(error);
        },
    );
};
