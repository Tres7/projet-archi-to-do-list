import axios from 'axios';
import { getToken } from '../utils/tokenStorage';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
    throw new Error('VITE_API_URL is not defined in the environment variables');
}

export const apiClient = axios.create({
    baseURL: apiUrl,
});

apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
