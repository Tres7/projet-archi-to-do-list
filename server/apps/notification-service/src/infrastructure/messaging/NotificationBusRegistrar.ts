import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import type { NotificationEventHandler } from '../../application/NotificationEventHandler.ts';

export class NotificationBusRegistrar {
    static readonly QUEUE = 'notification-service';

    constructor(
        private readonly bus: MessageBus,
        private readonly handler: NotificationEventHandler,
    ) {}

    register() {
        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.PROJECT_CREATED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.PROJECT_CREATED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.PROJECT_CLOSED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.PROJECT_CLOSED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.PROJECT_CREATION_REJECTED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.PROJECT_CREATION_REJECTED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.PROJECT_CLOSURE_REJECTED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.PROJECT_CLOSURE_REJECTED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_CREATED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_CREATED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_CLOSED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_CLOSED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_REOPENED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_REOPENED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_DELETED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_DELETED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_CREATION_REJECTED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_CREATION_REJECTED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
                    payload,
                });
            },
        );

        this.bus.subscribe(
            NotificationBusRegistrar.QUEUE,
            EVENT_NAMES.TASK_DELETION_REJECTED,
            async ({ payload }) => {
                await this.handler.handle({
                    name: EVENT_NAMES.TASK_DELETION_REJECTED,
                    payload,
                });
            },
        );
    }
}
