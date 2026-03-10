import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';
import type { EventName } from '../../../../common/contracts/events/event-names.ts';
import type { EventPayloadMap } from '../../../../common/contracts/events/event-map.ts';

import type { EmailSender } from '../domain/ports/EmailSender.ts';
import type { SsePublisher } from '../domain/ports/SsePublisher.ts';
import {
    CLIENT_NOTIFICATION_EVENT_NAMES,
    type ClientNotificationEvent,
} from '../domain/types/ClientNotificationEvent.ts';

type NotificationDomainEvent = {
    [K in EventName]: {
        name: K;
        payload: EventPayloadMap[K];
    };
}[EventName];

export class NotificationEventHandler {
    constructor(
        private readonly emailSender: EmailSender,
        private readonly ssePublisher: SsePublisher,
        private readonly fallbackTo: string,
    ) {}

    async handle(event: NotificationDomainEvent): Promise<void> {
        switch (event.name) {
            case EVENT_NAMES.PROJECT_CREATED:
                this.publishProject(
                    event.payload.ownerId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED,
                        projectId: event.payload.projectId,
                        refresh: ['projects'],
                        message: 'Project created',
                    },
                );
                return;

            case EVENT_NAMES.PROJECT_CLOSED:
                this.publishProject(
                    event.payload.ownerId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED,
                        projectId: event.payload.projectId,
                        refresh: ['projects', 'project-details'],
                        message: 'Project closed',
                    },
                );

                await this.emailSender.send({
                    to: event.payload.ownerEmail || this.fallbackTo,
                    subject: 'Project closed',
                    text: `Project ${event.payload.projectId} has been closed.`,
                    html: `<b>Project closed</b><br/>Project ID: ${event.payload.projectId}`,
                });
                return;

            case EVENT_NAMES.PROJECT_DELETED:
                this.publishProject(
                    event.payload.ownerId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_DELETED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_DELETED,
                        projectId: event.payload.projectId,
                        refresh: ['projects'],
                        message: 'Project deleted',
                    },
                );
                return;

            case EVENT_NAMES.TASK_CREATED:
                this.publishTask(
                    event.payload.userId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
                        projectId: event.payload.projectId,
                        taskId: event.payload.taskId,
                        refresh: ['project-details'],
                        message: 'Task created',
                    },
                );
                return;

            case EVENT_NAMES.TASK_CLOSED:
            case EVENT_NAMES.TASK_REOPENED:
                this.publishTask(
                    event.payload.userId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
                        projectId: event.payload.projectId,
                        taskId: event.payload.taskId,
                        refresh: ['project-details'],
                        message: 'Task updated',
                    },
                );

                if (event.name === EVENT_NAMES.TASK_REOPENED) {
                    await this.emailSender.send({
                        to: event.payload.userEmail || this.fallbackTo,
                        subject: 'Task reopened',
                        text: `Task ${event.payload.taskId} was reopened in project ${event.payload.projectId}.`,
                        html: `<b>Task reopened</b><br/>Task ID: ${event.payload.taskId}<br/>Project ID: ${event.payload.projectId}`,
                    });
                }

                return;

            case EVENT_NAMES.TASK_DELETED:
                this.publishTask(
                    event.payload.userId,
                    CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
                    {
                        type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
                        projectId: event.payload.projectId,
                        taskId: event.payload.taskId,
                        refresh: ['project-details'],
                        message: 'Task deleted',
                    },
                );
                return;

            case EVENT_NAMES.TASK_CREATION_REJECTED:
                this.publishRejected(
                    event.payload.userId,
                    event.payload.reason,
                    event.payload.projectId,
                    event.payload.taskId,
                );
                return;

            case EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED:
                this.publishRejected(
                    event.payload.userId,
                    event.payload.reason,
                    event.payload.projectId,
                    event.payload.taskId,
                );
                return;

            case EVENT_NAMES.TASK_DELETION_REJECTED:
                this.publishRejected(
                    event.payload.userId,
                    event.payload.reason,
                    event.payload.projectId,
                    event.payload.taskId,
                );
                return;

            case EVENT_NAMES.TASK_CREATION_REQUESTED:
            case EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED:
            case EVENT_NAMES.TASK_DELETION_REQUESTED:
            case EVENT_NAMES.TASK_LIST_REQUESTED:
            case EVENT_NAMES.TASK_LIST_REPLIED:
                return;
        }
    }

    private publishProject(
        userId: string,
        eventName:
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_DELETED,
        event: ClientNotificationEvent,
    ) {
        this.ssePublisher.publishToUser(userId, eventName, event);
        console.log('[notification:sse]', eventName, event);
    }

    private publishTask(
        userId: string,
        eventName:
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED
            | typeof CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
        event: ClientNotificationEvent,
    ) {
        this.ssePublisher.publishToUser(userId, eventName, event);
        console.log('[notification:sse]', eventName, event);
    }

    private publishRejected(
        userId: string,
        reason: string,
        projectId?: string,
        taskId?: string,
    ) {
        const event: ClientNotificationEvent = {
            type: CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED,
            reason,
            projectId,
            taskId,
            refresh: [],
            message: 'Operation rejected',
        };

        this.ssePublisher.publishToUser(
            userId,
            CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED,
            event,
        );

        console.log(
            '[notification:sse]',
            CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED,
            event,
        );
    }
}
