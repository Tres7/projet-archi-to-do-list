export interface ProjectTaskItemDto {
    id: string;
    name: string;
    description: string;
    status: 'OPEN' | 'DONE';
    createdAt: string;
    userId: string;
    projectId: string;
}

export interface ProjectDetailsDto {
    id: string;
    name: string;
    description: string;
    status: 'OPEN' | 'CLOSED';
    openTaskCount: number;
    ownerId: string;
    tasks: ProjectTaskItemDto[];
}
