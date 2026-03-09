import { apiClient } from '../../../shared/api/apiClient';
import type { LoginRequest, RegisterRequest, User } from '../model/types';

export const authApi = {
    login: async (data: LoginRequest): Promise<string> => {
        const response = await apiClient.post<{ token: string }>(
            '/auth/login',
            data,
        );
        return response.data.token;
    },

    register: async (data: RegisterRequest): Promise<User> => {
        const response = await apiClient.post<User>('/auth/register', {
            email: data.email,
            username: data.username,
            password: data.password,
        });
        return response.data;
    },
};
