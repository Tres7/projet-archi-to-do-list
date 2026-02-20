import { apiClient } from '../../../shared/api/apiClient';

export const userApi = {
    updateUsername: async (id: string, username: string): Promise<void> => {
        await apiClient.patch(`/users/${id}/name`, { username });
    },
    changePassword: async (id: string, password: string): Promise<void> => {
        await apiClient.patch(`/users/${id}/password`, { password });
    },
    deleteAccount: async (id: string): Promise<void> => {
        await apiClient.delete(`/users/${id}`);
    },
    getUserById: async (id: string) => {
        return (await apiClient.get<{ id: string; userName: string }>(`/users/${id}`)).data;
    }
};