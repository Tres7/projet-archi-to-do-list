import type { EventSubscriber } from './infrastructure/messaging/bullmq/bullmq.types.ts';
import nodemailer from 'nodemailer';

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

    constructor(private readonly sub: EventSubscriber) {}

    private async send(
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

    async start() {
        this.sub.on('task.created', async (evt) => {
            const to = evt.payload.userEmail || this.fallbackTo;

            console.log('[notification] task.created', {
                to,
                taskId: evt.payload.taskId,
            });

            await this.send(
                to,
                'New task created',
                `Task "${evt.payload.name}" created (id=${evt.payload.taskId})`,
                `<b>New task created</b><br/>${evt.payload.name} (id=${evt.payload.taskId})`,
            );
        });

        this.sub.on('task.reopened', async (evt) => {
            const { taskId, userEmail } = evt.payload;

            const toEmail = evt.payload.userEmail || this.fallbackTo;

            console.log('[notification] task reopened', {
                to: toEmail,
                taskId,
            });

            await this.send(
                toEmail,
                'Task reopened',
                `Task "${taskId}" reopened`,
                `<b>Task reopened</b><br/>${taskId}`,
            );
        });

        this.sub.on('task.deleted', async (evt) => {
            console.log('[notification] task.deleted', evt.payload);
        });

        this.sub.on('project.closed', async (evt) => {
            const to = evt.payload.userEmail || this.fallbackTo;

            console.log('[notification] project.closed', {
                to,
                projectId: evt.payload.projectId,
            });

            // await this.send(to, 'Project closed', `Project ${evt.payload.projectId} closed`);
        });

        await this.sub.start();
        console.log('[notification] started');
    }

    async stop() {
        await this.sub.stop();
        console.log('[notification] stopped');
    }
}
