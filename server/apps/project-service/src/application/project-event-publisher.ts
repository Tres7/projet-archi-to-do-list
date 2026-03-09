import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';
import type {
    ProjectClosedPayload,
    ProjectClosureRejectedPayload,
    ProjectCreatedPayload,
    ProjectCreationRejectedPayload,
} from '../../../../common/contracts/events/project.events.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { Project } from '../domain/entities/Project.ts';

export async function publishProjectCreated(
    bus: MessageBus,
    target: string,
    params: {
        operationId: string;
        ownerEmail: string;
        project: Project;
    },
) {
    const raw = params.project.toPrimitives();

    const payload: ProjectCreatedPayload = {
        operationId: params.operationId,
        projectId: raw.id,
        ownerId: raw.ownerId,
        ownerEmail: params.ownerEmail,
        name: raw.name,
        description: raw.description,
        status: 'OPEN',
        openTaskCount: 0,
    };

    await bus.publish(target, EVENT_NAMES.PROJECT_CREATED, payload);
}

export async function publishProjectCreationRejected(
    bus: MessageBus,
    target: string,
    payload: ProjectCreationRejectedPayload,
) {
    await bus.publish(target, EVENT_NAMES.PROJECT_CREATION_REJECTED, payload);
}

export async function publishProjectClosed(
    bus: MessageBus,
    target: string,
    payload: ProjectClosedPayload,
) {
    await bus.publish(target, EVENT_NAMES.PROJECT_CLOSED, payload);
}

export async function publishProjectClosureRejected(
    bus: MessageBus,
    target: string,
    payload: ProjectClosureRejectedPayload,
) {
    await bus.publish(target, EVENT_NAMES.PROJECT_CLOSURE_REJECTED, payload);
}
