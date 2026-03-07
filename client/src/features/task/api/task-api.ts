import { apiClient } from '../../../shared/api/apiClient';

export const taskApi = {
    createTask: async (projectId: string, name: string, description: string): Promise<void> => {
        await apiClient.post(`/projects/${projectId}/tasks`, { name, description });
    },

    toggleStatus: async (projectId: string, taskId: string): Promise<void> => {
        await apiClient.patch(`/projects/${projectId}/tasks/${taskId}/toggle-status`);
    },

    deleteTask: async (projectId: string, taskId: string): Promise<void> => {
        await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    },
};
