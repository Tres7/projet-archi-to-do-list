import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { ProjectEventHandler } from '../../application/ProjectEventHandler.ts';

export class ProjectEventConsumer {
    static readonly QUEUE = 'project-service';

    constructor(
        private readonly bus: MessageBus,
        private readonly handler: ProjectEventHandler,
    ) {}

    register() {
        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.PROJECT_CREATION_REQUESTED,
            async ({ payload }) => {
                this.handler.onProjectCreationRequested(payload);
            },
        );

        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.PROJECT_CLOSURE_REQUESTED,
            async ({ payload }) =>
                this.handler.onProjectClosureRequested(payload),
        );

        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.TASK_CREATED,
            async ({ payload }) => this.handler.onTaskCreated(payload),
        );

        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.TASK_CLOSED,
            async ({ payload }) => this.handler.onTaskClosed(payload),
        );

        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.TASK_REOPENED,
            async ({ payload }) => this.handler.onTaskReopened(payload),
        );

        this.bus.subscribe(
            ProjectEventConsumer.QUEUE,
            EVENT_NAMES.TASK_DELETED,
            async ({ payload }) => this.handler.onTaskDeleted(payload),
        );
    }

    async start() {
        await this.bus.start(ProjectEventConsumer.QUEUE);
    }

    async stop() {
        await this.bus.stop(ProjectEventConsumer.QUEUE);
    }
}
