import type { EventSubscriber } from '../../infrastructure/messaging/bullmq/bullmq.types.ts';
import nodemailer from 'nodemailer';

export class NotificationModule {
    private transporter: nodemailer.Transporter;
    //todo: move email configuration to env vars and create a separate EmailService
    constructor(private readonly sub: EventSubscriber) {
        this.transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
        });
    }

    async start() {
        this.sub.on('task.created', async (evt) => {
            console.log('[notification] task.created:', evt);
            // example
            // const info = await this.transporter.sendMail({
            //     from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
            //     to: 'bar@example.com, baz@example.com',
            //     subject: 'New task created',
            //     text: `A new task "${evt.payload.name}" has been created.`,
            //     html:
            //         '<b>New task created</b><br>A new task "<i>' +
            //         evt.payload.name +
            //         '</i>" has been created.',
            // });
        });

        this.sub.on('task.deleted', async (evt) => {
            console.log('[notification] task.deleted:', evt.payload);
        });

        this.sub.on('project.closed', async (evt) => {
            console.log('[notification] project.closed:', evt.payload);
        });
        this.sub.on('project.closed', async (evt) => {
            console.log('[notification] project.closed:', evt.payload);
        });

        await this.sub.start();
    }

    async stop() {
        await this.sub.stop();
    }
}
