import axios, { type AxiosInstance } from 'axios';
import { getToken } from '../utils/tokenStorage';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
    throw new Error('VITE_API_URL is not defined in the environment variables');
}

export const apiVersion = __API_CONFIG__.authApiVersion;
const authApiBaseUrl = apiVersion === 'legacy' ? apiUrl : `${apiUrl}/${apiVersion}`;

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
    axios.create({ baseURL: authApiBaseUrl }),
);
