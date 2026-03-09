import React from 'react';
import { taskApi } from '../api/task-api';

export const useTasks = (projectId: string) => {
    const createTask = React.useCallback(
        async (name: string, description: string) => {
            await taskApi.createTask(projectId, name, description);
        },
        [projectId],
    );

    const toggleStatus = React.useCallback(
        async (taskId: string) => {
            await taskApi.toggleStatus(projectId, taskId);
        },
        [projectId],
    );

    const deleteTask = React.useCallback(
        async (taskId: string) => {
            await taskApi.deleteTask(projectId, taskId);
        },
        [projectId],
    );

    return { createTask, toggleStatus, deleteTask };
};
