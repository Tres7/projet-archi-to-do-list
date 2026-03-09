import React from 'react';
import type { ProjectDetail } from '../model/types';
import { projectApi } from '../api/project-api';

export const useProjectDetail = (projectId: string) => {
    const [project, setProject] = React.useState<ProjectDetail | null>(null);

    React.useEffect(() => {
        projectApi.getProjectDetail(projectId).then(setProject);
    }, [projectId]);

    const fetchProjectDetail = React.useCallback(async () => {
        const project = await projectApi.getProjectDetail(projectId);
        setProject(project);
    }, [projectId]);

    const closeProject = React.useCallback(async () => {
        await projectApi.closeProject(projectId);
    }, [projectId]);

    return { project, closeProject, fetchProjectDetail };
};
