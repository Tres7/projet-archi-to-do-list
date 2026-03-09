export type TaskStatus = 'OPEN' | 'DONE';

export const TaskStatusValues = {
    OPEN: 'OPEN' as TaskStatus,
    DONE: 'DONE' as TaskStatus,
};

export function toggleTaskStatus(status: TaskStatus): TaskStatus {
    return status === 'OPEN' ? 'DONE' : 'OPEN';
}
