import { authApiClient } from '../../../shared/api/apiClient';

export const userApi = {
    updateUsername: async (id: string, username: string): Promise<void> => {
        await authApiClient.patch(`/users/${id}/name`, { username });
    },
    changePassword: async (id: string, password: string): Promise<void> => {
        await authApiClient.patch(`/users/${id}/password`, { password });
    },
    deleteAccount: async (id: string): Promise<void> => {
        await authApiClient.delete(`/users/${id}`);
    },
    getUserById: async (id: string) => {
        return (await authApiClient.get<{ id: string; userName: string }>(`/users/${id}`)).data;
    }
};