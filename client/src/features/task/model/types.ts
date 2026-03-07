export type Task = {
    id: string;
    name: string;
    description: string;
    status: 'OPEN' | 'DONE';
    createdAt: string;
    userId: string;
    projectId: string;
}

