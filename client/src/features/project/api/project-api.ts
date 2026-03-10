import { apiClient } from '../../../shared/api/apiClient';
import type { Project, ProjectDetail } from '../model/types';

export const projectApi = {
    getProjects: async (): Promise<Project[]> => {
        return (await apiClient.get<Project[]>('/projects')).data;
    },

    getProjectDetail: async (projectId: string): Promise<ProjectDetail> => {
        return (
            await apiClient.get<ProjectDetail>(`/projects/${projectId}/details`)
        ).data;
    },

    createProject: async (name: string, description: string): Promise<void> => {
        await apiClient.post('/projects', { name, description });
    },

    closeProject: async (projectId: string): Promise<void> => {
        await apiClient.post(`/projects/${projectId}/close`);
    },

    deleteProject: async (projectId: string): Promise<void> => {
        console.log('Deleting project with ID:', projectId);
        await apiClient.delete(`/projects/${projectId}`);
    },
};
