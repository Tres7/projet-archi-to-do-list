import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
    baseURL: apiUrl,
});
