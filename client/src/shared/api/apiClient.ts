import axios, { type AxiosInstance } from 'axios';
import { getToken } from '../utils/tokenStorage';

declare global {
    interface Window {
        __ENV__?: { VITE_API_VERSION?: string };
    }
}

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
    throw new Error('VITE_API_URL is not defined in the environment variables');
}

export const apiVersion = window.__ENV__?.VITE_API_VERSION ?? import.meta.env.VITE_API_VERSION;
if (!apiVersion) {
    throw new Error('VITE_API_VERSION is not defined in the environment variables');
}

function withAuthHeader(client: AxiosInstance): AxiosInstance {
    client.interceptors.request.use((config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });
    return client;
}

export const apiClient = withAuthHeader(axios.create({ baseURL: `${apiUrl}/v1` }));

export const authApiClient = withAuthHeader(
    axios.create({ baseURL: `${apiUrl}/${apiVersion}` }),
);
