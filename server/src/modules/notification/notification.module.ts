import type { EventSubscriber } from '../../infrastructure/messaging/bullmq/bullmq.types.ts';

export class NotificationModule {
    constructor(private readonly sub: EventSubscriber) {}

    async start() {
        this.sub.on('task.created', async (evt) => {
            console.log('[notification] task.created:', evt.payload);
        });

        await this.sub.start();
    }

    async stop() {
        await this.sub.stop();
    }
}
