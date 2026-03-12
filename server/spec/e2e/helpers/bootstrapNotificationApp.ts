import type { RunningNotificationApp } from './types.ts';
import { listen } from './utils.ts';

export async function bootstrapNotificationApp(): Promise<RunningNotificationApp> {
    const { createBullMqMessageBus } =
        await import('../../../common/messaging/bullmq.module.ts');
    const { createApp } =
        await import('../../../apps/notification-service/src/app.ts');

    const bus = createBullMqMessageBus({
        redis: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
        },
        prefix: process.env.BUS_PREFIX ?? 'todo',
        concurrency: 10,
    });

    const { app, notificationModule } = createApp(bus);

    await notificationModule.start();

    const runtime = await listen(app);

    return {
        app,
        server: runtime.server,
        baseUrl: runtime.baseUrl,
        stop: () => notificationModule.stop(),
        closeBus: () => bus.close(),
    };
}
