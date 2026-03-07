import type { AcceptedOperationResponse } from '../../../../common/contracts/requests/task-list.request.ts';
import type { ProjectDetailsDto } from '../../../../common/contracts/queries/project-details.dto.ts';
import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';
import type { TaskListRepliedPayload } from '../../../../common/contracts/events/task.events.ts';
import { NotFoundError } from '../../../../common/errors/NotFoundError.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../domain/repositories/ProjectRepository.ts';
import { randomUUID } from 'crypto';

export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly bus: MessageBus,
    ) {}

    async requestCreateProject(params: {
        ownerId: string;
        ownerEmail: string;
        name: string;
        description: string;
    }): Promise<AcceptedOperationResponse> {
        const operationId = randomUUID();
        const projectId = randomUUID();

        await this.bus.publish(
            'project-service',
            EVENT_NAMES.PROJECT_CREATION_REQUESTED,
            {
                operationId,
                projectId,
                ownerId: params.ownerId,
                ownerEmail: params.ownerEmail,
                name: params.name,
                description: params.description,
            },
        );

        return {
            accepted: true,
            operationId,
            resourceId: projectId,
        };
    }

    async requestCloseProject(params: {
        projectId: string;
        ownerId: string;
        ownerEmail: string;
    }): Promise<AcceptedOperationResponse> {
        const operationId = randomUUID();

        await this.bus.publish(
            'project-service',
            EVENT_NAMES.PROJECT_CLOSURE_REQUESTED,
            {
                operationId,
                projectId: params.projectId,
                ownerId: params.ownerId,
                ownerEmail: params.ownerEmail,
            },
        );

        return {
            accepted: true,
            operationId,
            resourceId: params.projectId,
        };
    }

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

    async getProjects(ownerId: string) {
        const projects = await this.projectRepository.findByOwnerId(ownerId);
        return projects.map((project) => project.toPrimitives());
    }

    async getProjectDetails(
        projectId: string,
        ownerId: string,
    ): Promise<ProjectDetailsDto> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundError();
        }

        project.assertOwnedBy(ownerId);

        const reply = await this.bus.request(
            'task-service',
            EVENT_NAMES.TASK_LIST_REQUESTED,
            EVENT_NAMES.TASK_LIST_REPLIED,
            {
                projectId,
                userId: ownerId,
            },
        );

        const taskReply = reply as TaskListRepliedPayload;

        return {
            ...project.toPrimitives(),
            tasks: taskReply.tasks,
        };
    }
}
