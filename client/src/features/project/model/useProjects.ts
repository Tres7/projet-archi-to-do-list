import React from 'react';
import type { Project } from '../model/types';
import { projectApi } from '../api/project-api';

export const useProjects = () => {
    const [projects, setProjects] = React.useState<Project[]>([]);

    React.useEffect(() => {
        projectApi.getProjects().then(setProjects);
    }, []);

    const fetchProjects = React.useCallback(async () => {
        const projects = await projectApi.getProjects();
        setProjects(projects);
    }, []);

    const createProject = React.useCallback(
        async (name: string, description: string) => {
            await projectApi.createProject(name, description);
            await fetchProjects();
        },
        [fetchProjects],
    );

    const deleteProject = React.useCallback(async (projectId: string) => {
        await projectApi.deleteProject(projectId);
    }, []);

    return { projects, createProject, fetchProjects, deleteProject };
};
