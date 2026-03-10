import type {
    TaskClosedPayload,
    TaskCreatedPayload,
    TaskDeletedPayload,
    TaskReopenedPayload,
} from '../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../domain/repositories/ProjectRepository.ts';

import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';

export class ProjectEventHandler {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly bus: MessageBus,
    ) {}

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
