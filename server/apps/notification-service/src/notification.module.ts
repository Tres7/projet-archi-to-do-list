import type { Express } from 'express';

import type { MessageBus } from '@app/common/messaging/MessageBus';
import { NotificationEventHandler } from './application/NotificationEventHandler.ts';
import { NodemailerEmailSender } from './infrastructure/email/NodemailerEmailSender.ts';
import { NotificationBusRegistrar } from './infrastructure/messaging/NotificationBusRegistrar.ts';
import { InMemorySseHub } from './infrastructure/sse/InMemorySseHub.ts';
import { createSseRouter } from './infrastructure/sse/createSseRouter.ts';
import { loadOpenApiSpec } from './infrastructure/openapi/loadOpenApiSpec.ts';

function env(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.trim() ? value : fallback;
}

export class NotificationModule {
    private readonly sseHub: InMemorySseHub;
    private readonly emailSender: NodemailerEmailSender;
    private readonly eventHandler: NotificationEventHandler;
    private readonly registrar: NotificationBusRegistrar;

    constructor(
        private readonly bus: MessageBus,
        private readonly app: Express,
    ) {
        this.sseHub = new InMemorySseHub();
        this.emailSender = new NodemailerEmailSender();
        this.eventHandler = new NotificationEventHandler(
            this.emailSender,
            this.sseHub,
            env('NOTIFY_FALLBACK_TO', 'stub-user@todo.local'),
        );
        this.registrar = new NotificationBusRegistrar(
            this.bus,
            this.eventHandler,
        );
    }

    configureHttp() {
        this.app.use(createSseRouter(this.sseHub));
        this.app.use('/v1', createSseRouter(this.sseHub));

        if (process.env.NODE_ENV !== 'production') {
            this.app.get('/openapi/v1.json', (_req, res) =>
                res.json(loadOpenApiSpec()),
            );
        }
    }

    async start() {
        this.configureHttp();
        this.registrar.register();
        await this.bus.start(NotificationBusRegistrar.QUEUE);
        console.log('[notification] started');
    }

    async stop() {
        await this.bus.stop(NotificationBusRegistrar.QUEUE);
        console.log('[notification] stopped');
    }
}
