import type {
    ProjectClosureRequestedPayload,
    ProjectCreationRequestedPayload,
} from '../../../../common/contracts/events/project.events.ts';
import type {
    TaskClosedPayload,
    TaskCreatedPayload,
    TaskDeletedPayload,
    TaskReopenedPayload,
} from '../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../domain/repositories/ProjectRepository.ts';
import { Project } from '../domain/entities/Project.ts';
import {
    publishProjectClosed,
    publishProjectClosureRejected,
    publishProjectCreated,
    publishProjectCreationRejected,
} from './project-event-publisher.ts';
import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';

export class ProjectEventHandler {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly bus: MessageBus,
    ) {}

    async onProjectCreationRequested(event: ProjectCreationRequestedPayload) {
        try {
            const project = Project.create({
                id: event.projectId,
                ownerId: event.ownerId,
                name: event.name,
                description: event.description,
            });

            await this.projectRepository.save(project);

            await publishProjectCreated(this.bus, 'notification-service', {
                operationId: event.operationId,
                ownerEmail: event.ownerEmail,
                project,
            });
        } catch (error) {
            await publishProjectCreationRejected(
                this.bus,
                'notification-service',
                {
                    operationId: event.operationId,
                    projectId: event.projectId,
                    ownerId: event.ownerId,
                    ownerEmail: event.ownerEmail,
                    reason:
                        error instanceof Error
                            ? error.message
                            : 'Failed to create project',
                },
            );
        }
    }

    async onProjectClosureRequested(event: ProjectClosureRequestedPayload) {
        console.log(event);
        try {
            const project = await this.projectRepository.findById(
                event.projectId,
            );
            if (!project) {
                throw new Error('Project not found');
            }

            project.assertOwnedBy(event.ownerId);
            project.close();

            await this.projectRepository.save(project);

            await publishProjectClosed(this.bus, 'notification-service', {
                operationId: event.operationId,
                projectId: event.projectId,
                ownerId: event.ownerId,
                ownerEmail: event.ownerEmail,
            });
        } catch (error) {
            await publishProjectClosureRejected(
                this.bus,
                'notification-service',
                {
                    operationId: event.operationId,
                    projectId: event.projectId,
                    ownerId: event.ownerId,
                    ownerEmail: event.ownerEmail,
                    reason:
                        error instanceof Error
                            ? error.message
                            : 'Failed to close project',
                },
            );
        }
    }

    async onTaskCreated(event: TaskCreatedPayload) {
        const project = await this.projectRepository.findById(event.projectId);
        if (!project) return;

        project.increaseOpenTaskCount();
        await this.projectRepository.save(project);

        await this.bus.publish(
            'notification-service',
            EVENT_NAMES.TASK_CREATED,
            event,
        );
    }

    async onTaskClosed(event: TaskClosedPayload) {
        const project = await this.projectRepository.findById(event.projectId);
        if (!project) return;

        project.decreaseOpenTaskCount();
        await this.projectRepository.save(project);

        await this.bus.publish(
            'notification-service',
            EVENT_NAMES.TASK_CLOSED,
            event,
        );
    }

    async onTaskReopened(event: TaskReopenedPayload) {
        const project = await this.projectRepository.findById(event.projectId);
        if (!project) return;

        project.increaseOpenTaskCount();
        await this.projectRepository.save(project);

        await this.bus.publish(
            'notification-service',
            EVENT_NAMES.TASK_REOPENED,
            event,
        );
    }

    async onTaskDeleted(event: TaskDeletedPayload) {
        const project = await this.projectRepository.findById(event.projectId);
        if (!project) return;

        if (event.previousStatus === 'OPEN') {
            project.decreaseOpenTaskCount();
            await this.projectRepository.save(project);
        }

        await this.bus.publish(
            'notification-service',
            EVENT_NAMES.TASK_DELETED,
            event,
        );
    }
}
