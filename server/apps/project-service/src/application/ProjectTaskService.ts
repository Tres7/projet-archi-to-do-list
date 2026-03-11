import { randomUUID } from 'crypto';
import type { AcceptedOperationResponse } from '../../../../common/contracts/requests/task-list.request.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../domain/repositories/ProjectRepository.ts';
import { NotFoundError } from '../../../../common/errors/NotFoundError.ts';
import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';

export class ProjectTaskService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly bus: MessageBus,
    ) {}

    async requestCreateTask(params: {
        projectId: string;
        userId: string;
        userEmail: string;
        name: string;
        description: string;
    }): Promise<AcceptedOperationResponse> {
        const operationId = randomUUID();
        const taskId = randomUUID();

        const project = await this.projectRepository.findById(params.projectId);
        if (!project) {
            throw new NotFoundError();
        }

        project.assertOwnedBy(params.userId);
        project.assertOpen();

        await this.bus.publish(
            'task-service',
            EVENT_NAMES.TASK_CREATION_REQUESTED,
            {
                operationId,
                taskId,
                projectId: params.projectId,
                userId: params.userId,
                userEmail: params.userEmail,
                name: params.name,
                description: params.description,
            },
        );

        return {
            accepted: true,
            operationId,
            resourceId: taskId,
        };
    }

    async requestToggleTaskStatus(params: {
        projectId: string;
        taskId: string;
        userId: string;
        userEmail: string;
    }): Promise<AcceptedOperationResponse> {
        const operationId = randomUUID();

        const project = await this.projectRepository.findById(params.projectId);
        if (!project) {
            throw new NotFoundError();
        }

        project.assertOwnedBy(params.userId);
        project.assertOpen();

        await this.bus.publish(
            'task-service',
            EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED,
            {
                operationId,
                taskId: params.taskId,
                projectId: params.projectId,
                userId: params.userId,
                userEmail: params.userEmail,
            },
        );

        return {
            accepted: true,
            operationId,
            resourceId: params.taskId,
        };
    }

    async requestDeleteTask(params: {
        projectId: string;
        taskId: string;
        userId: string;
        userEmail: string;
    }): Promise<AcceptedOperationResponse> {
        const operationId = randomUUID();

        const project = await this.projectRepository.findById(params.projectId);
        if (!project) {
            throw new NotFoundError();
        }

        project.assertOwnedBy(params.userId);
        project.assertOpen();

        await this.bus.publish(
            'task-service',
            EVENT_NAMES.TASK_DELETION_REQUESTED,
            {
                operationId,
                taskId: params.taskId,
                projectId: params.projectId,
                userId: params.userId,
                userEmail: params.userEmail,
            },
        );

        return {
            accepted: true,
            operationId,
            resourceId: params.taskId,
        };
    }
}
