import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { TaskEventHandler } from '../../application/TaskEventHandler.ts';
import type { TaskService } from '../../application/TaskService.ts';

export class TaskEventConsumer {
    static readonly QUEUE = 'task-service';

    constructor(
        private readonly bus: MessageBus,
        private readonly handler: TaskEventHandler,
        private readonly taskService: TaskService,
    ) {}

    register() {
        this.bus.subscribe(
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_CREATION_REQUESTED,
            async ({ payload }) =>
                this.handler.onTaskCreationRequested(payload),
        );

        this.bus.subscribe(
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED,
            async ({ payload }) =>
                this.handler.onTaskStatusToggleRequested(payload),
        );

        this.bus.subscribe(
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_DELETION_REQUESTED,
            async ({ payload }) =>
                this.handler.onTaskDeletionRequested(payload),
        );

        this.bus.respond(
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_LIST_REQUESTED,
            EVENT_NAMES.TASK_LIST_REPLIED,
            async ({ payload }) => {
                const tasks = await this.taskService.getTasksByProject(
                    payload.projectId,
                    payload.userId,
                );

                return {
                    ok: true,
                    projectId: payload.projectId,
                    tasks,
                };
            },
        );
    }

    async start() {
        await this.bus.start(TaskEventConsumer.QUEUE);
    }

    async stop() {
        await this.bus.stop(TaskEventConsumer.QUEUE);
    }
}
