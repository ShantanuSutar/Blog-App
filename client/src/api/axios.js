import axios from 'axios';

const URL = import.meta.env.VITE_BASE_URL;

// Create axios instance with default config
const api = axios.create({
    baseURL: URL,
    withCredentials: false
});

api.interceptors.request.use((config) => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser?.token) {
            config.headers.Authorization = `Bearer ${storedUser.token}`;
        }
    } catch {
        localStorage.removeItem('user');
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth:expired'));
        }
        return Promise.reject(error);
    }
);

export default api;
