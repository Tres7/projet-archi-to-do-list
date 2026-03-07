import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';
import type {
    TaskCreationRequestedPayload,
    TaskDeletionRequestedPayload,
    TaskStatusToggleRequestedPayload,
} from '../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { TaskRepository } from '../domain/repositories/TaskRepository.ts';
import { Task } from '../domain/entities/Task.ts';
import {
    publishTaskClosed,
    publishTaskCreated,
    publishTaskCreationRejected,
    publishTaskDeleted,
    publishTaskDeletionRejected,
    publishTaskReopened,
    publishTaskToggleRejected,
} from './task-event-publisher.ts';

export class TaskEventHandler {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly bus: MessageBus,
    ) {}

    async onTaskCreationRequested(event: TaskCreationRequestedPayload) {
        try {
            const task = Task.create({
                id: event.taskId,
                userId: event.userId,
                projectId: event.projectId,
                name: event.name,
                description: event.description,
            });

            await this.taskRepository.save(task);

            await publishTaskCreated(this.bus, 'project-service', {
                operationId: event.operationId,
                userEmail: event.userEmail,
                task,
            });
        } catch (error) {
            await publishTaskCreationRejected(
                this.bus,
                'notification-service',
                {
                    operationId: event.operationId,
                    taskId: event.taskId,
                    projectId: event.projectId,
                    userId: event.userId,
                    userEmail: event.userEmail,
                    reason:
                        error instanceof Error
                            ? error.message
                            : 'Failed to create task',
                },
            );
        }
    }

    async onTaskStatusToggleRequested(event: TaskStatusToggleRequestedPayload) {
        try {
            const task = await this.taskRepository.findById(event.taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            const before = task.toPrimitives();
            if (
                before.userId !== event.userId ||
                before.projectId !== event.projectId
            ) {
                throw new Error('Forbidden');
            }

            task.toggleStatus();
            await this.taskRepository.save(task);

            const after = task.toPrimitives();

            if (after.status === 'DONE') {
                await publishTaskClosed(this.bus, 'project-service', {
                    operationId: event.operationId,
                    taskId: after.id,
                    projectId: after.projectId,
                    userId: after.userId,
                    userEmail: event.userEmail,
                });
            } else {
                await publishTaskReopened(this.bus, 'project-service', {
                    operationId: event.operationId,
                    taskId: after.id,
                    projectId: after.projectId,
                    userId: after.userId,
                    userEmail: event.userEmail,
                });
            }
        } catch (error) {
            await publishTaskToggleRejected(this.bus, 'notification-service', {
                operationId: event.operationId,
                taskId: event.taskId,
                projectId: event.projectId,
                userId: event.userId,
                userEmail: event.userEmail,
                reason:
                    error instanceof Error
                        ? error.message
                        : 'Failed to toggle task',
            });
        }
    }

    async onTaskDeletionRequested(event: TaskDeletionRequestedPayload) {
        try {
            const task = await this.taskRepository.findById(event.taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            const raw = task.toPrimitives();

            if (
                raw.userId !== event.userId ||
                raw.projectId !== event.projectId
            ) {
                throw new Error('Forbidden');
            }

            await this.taskRepository.delete(event.taskId);

            await publishTaskDeleted(this.bus, 'project-service', {
                operationId: event.operationId,
                taskId: raw.id,
                projectId: raw.projectId,
                userId: raw.userId,
                userEmail: event.userEmail,
                previousStatus: raw.status,
            });
        } catch (error) {
            await publishTaskDeletionRejected(
                this.bus,
                'notification-service',
                {
                    operationId: event.operationId,
                    taskId: event.taskId,
                    projectId: event.projectId,
                    userId: event.userId,
                    userEmail: event.userEmail,
                    reason:
                        error instanceof Error
                            ? error.message
                            : 'Failed to delete task',
                },
            );
        }
    }
}
