import React from 'react';
import type { ProjectDetail } from '../model/types';
import { projectApi } from '../api/project-api';
import { useNavigate } from 'react-router-dom';

export const useProjectDetail = (projectId: string) => {
    const [project, setProject] = React.useState<ProjectDetail | null>(null);
    const navigate = useNavigate();

    React.useEffect(() => {
        projectApi.getProjectDetail(projectId).then(setProject);
    }, [projectId]);

    const fetchProjectDetail = React.useCallback(async () => {
        const project = await projectApi.getProjectDetail(projectId);
        setProject(project);
    }, [projectId]);

    const closeProject = React.useCallback(async () => {
        await projectApi.closeProject(projectId);
        navigate('/projects')
    }, [projectId]);

    return { project, closeProject, fetchProjectDetail };
};
