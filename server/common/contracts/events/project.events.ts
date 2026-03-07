export interface ProjectCreationRequestedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
    name: string;
    description: string;
}

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

export interface ProjectCreationRejectedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
    reason: string;
}

export interface ProjectClosureRequestedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
}

export interface ProjectClosedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
}

export interface ProjectClosureRejectedPayload {
    operationId: string;
    projectId: string;
    ownerId: string;
    ownerEmail: string;
    reason: string;
}
