export interface ProjectCreatedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
    name: string;
    description: string;
    status: 'OPEN';
    openTaskCount: 0;
}

export interface ProjectClosedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
}

export interface ProjectDeletedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
}
