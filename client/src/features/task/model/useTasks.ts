import React from 'react';
import { taskApi } from '../api/task-api';

export const useTasks = (
    projectId: string,
    refreshProject: () => Promise<void>) => {
    const createTask = React.useCallback(
        async (name: string, description: string) => {
            await taskApi.createTask(projectId, name, description);
            await refreshProject();
        },
        [projectId, refreshProject],
    );

    const toggleStatus = React.useCallback(
        async (taskId: string) => {
            await taskApi.toggleStatus(projectId, taskId);
            await refreshProject()
        },
        [projectId, refreshProject],
    );

    const deleteTask = React.useCallback(
        async (taskId: string) => {
            await taskApi.deleteTask(projectId, taskId);
            await refreshProject();
        },
        [projectId,refreshProject],
    );

    return { createTask, toggleStatus, deleteTask };
};
