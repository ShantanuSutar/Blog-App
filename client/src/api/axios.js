import axios from 'axios';

const URL = import.meta.env.VITE_BASE_URL;

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
        localStorage.removeItem('user');
        return null;
    }
};

const getRequestToken = (config) => {
    const authorization = typeof config?.headers?.get === 'function'
        ? config.headers.get('Authorization')
        : config?.headers?.Authorization;

    if (typeof authorization !== 'string') return null;
    const [scheme, token] = authorization.trim().split(/\s+/, 2);
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

// Create axios instance with default config
const api = axios.create({
    baseURL: URL,
    withCredentials: false
});

api.interceptors.request.use((config) => {
    const storedUser = readStoredUser();
    if (storedUser?.token) {
        config.headers.Authorization = `Bearer ${storedUser.token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
            const storedUser = readStoredUser();
            const requestToken = getRequestToken(error.config);

            // A request started before a successful login can finish later with
            // a 401. Only that request's token may invalidate the current session.
            if (storedUser?.token && requestToken === storedUser.token) {
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('auth:expired'));
            }
        }
        return Promise.reject(error);
    }
);

export default api;
