import React from 'react';
import type { Task } from './types';
import { taskApi } from '../api/task-api';

export const useTasks = (projectId: string, initialTasks: Task[]) => {
    const [tasks, setTasks] = React.useState<Task[]>(initialTasks);

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

    return { tasks, createTask, toggleStatus, deleteTask };
};
