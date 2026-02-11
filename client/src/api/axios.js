import axios from 'axios';

const URL = import.meta.env.VITE_BASE_URL;

// Create axios instance with default config
const api = axios.create({
    baseURL: URL,
    withCredentials: true
});

export default api;
