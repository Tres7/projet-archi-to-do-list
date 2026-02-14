import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
    throw new Error('VITE_API_URL is not defined in the environment variables');
}

export const apiClient = axios.create({
    baseURL: apiUrl,
});
