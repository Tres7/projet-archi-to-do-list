import nodemailer from 'nodemailer';
import { MessageBus } from '../../../common/messaging/MessageBus.ts';
import { EVENT_NAMES } from '../../../common/contracts/events/event-names.ts';

function env(key: string, fallback?: string) {
    return process.env[key] && process.env[key]!.trim()
        ? process.env[key]!
        : fallback;
}

export class NotificationModule {
    private transporter = nodemailer.createTransport({
        host: env('SMTP_HOST', 'localhost')!,
        port: Number(env('SMTP_PORT', '1025')!),
        secure: env('SMTP_SECURE', '0') === '1',
    });

    private from = env('SMTP_FROM', 'no-reply@todo.local')!;
    private fallbackTo = env('NOTIFY_FALLBACK_TO', 'stub-user@todo.local')!;
    private dryRun = env('NOTIFY_DRY_RUN', '0') === '1';

    constructor(private readonly bus: MessageBus) {}

    private async sendEmail(
        to: string,
        subject: string,
        text: string,
        html?: string,
    ) {
        if (this.dryRun) return;

        await this.transporter.sendMail({
            from: this.from,
            to,
            subject,
            text,
            html,
        });
    }

    private async handleSseConsole(eventName: string, payload: unknown) {
        console.log(`[notification:sse] ${eventName}`, payload);
    }

    private async handleProjectClosed(payload: {
        projectId: string;
        ownerEmail: string;
    }) {
        const to = payload.ownerEmail || this.fallbackTo;

        await this.sendEmail(
            to,
            'Project closed',
            `Project ${payload.projectId} has been closed.`,
            `<b>Project closed</b><br/>Project ID: ${payload.projectId}`,
        );
    }

    private async handleTaskReopened(payload: {
        taskId: string;
        projectId: string;
        userEmail: string;
    }) {
        const to = payload.userEmail || this.fallbackTo;

        await this.sendEmail(
            to,
            'Task reopened',
            `Task ${payload.taskId} was reopened in project ${payload.projectId}.`,
            `<b>Task reopened</b><br/>Task ID: ${payload.taskId}<br/>Project ID: ${payload.projectId}`,
        );
    }

    register() {
        const queue = 'notification-service';

        this.bus.subscribe(
            queue,
            EVENT_NAMES.PROJECT_CREATED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.PROJECT_CREATED,
                    payload,
                );
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.PROJECT_CREATION_REJECTED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.PROJECT_CREATION_REJECTED,
                    payload,
                );
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.PROJECT_CLOSED,
            async ({ payload }) => {
                await this.handleProjectClosed(payload);
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.PROJECT_CLOSURE_REJECTED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.PROJECT_CLOSURE_REJECTED,
                    payload,
                );
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_CREATED,
            async ({ payload }) => {
                await this.handleSseConsole(EVENT_NAMES.TASK_CREATED, payload);
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_CREATION_REJECTED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.TASK_CREATION_REJECTED,
                    payload,
                );
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_CLOSED,
            async ({ payload }) => {
                await this.handleSseConsole(EVENT_NAMES.TASK_CLOSED, payload);
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_REOPENED,
            async ({ payload }) => {
                await this.handleTaskReopened(payload);
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
                    payload,
                );
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_DELETED,
            async ({ payload }) => {
                await this.handleSseConsole(EVENT_NAMES.TASK_DELETED, payload);
            },
        );

        this.bus.subscribe(
            queue,
            EVENT_NAMES.TASK_DELETION_REJECTED,
            async ({ payload }) => {
                await this.handleSseConsole(
                    EVENT_NAMES.TASK_DELETION_REJECTED,
                    payload,
                );
            },
        );
    }

    async start() {
        this.register();
        await this.bus.start('notification-service');
        console.log('[notification] started');
    }

    async stop() {
        await this.bus.stop('notification-service');
        console.log('[notification] stopped');
    }
}
