import type { Task } from '../../task/model/types';

export type Project = {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    status: 'OPEN' | 'CLOSED';
    openTaskCount: number;
}

export type ProjectDetail = Project & {
    tasks: Task[];
}