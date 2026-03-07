import React from 'react';
import type { Project } from '../model/types';
import { projectApi } from '../api/project-api';

export const useProjects = () => {
    const [projects, setProjects] = React.useState<Project[]>([]);

    React.useEffect(() => {
        projectApi.getProjects().then(setProjects);
    }, []);

    const createProject = React.useCallback(
        async (name: string, description: string) => {
            await projectApi.createProject(name, description);
        },
        [],
    );

    return { projects, createProject };
};
