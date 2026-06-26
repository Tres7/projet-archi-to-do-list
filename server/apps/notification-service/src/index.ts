import { loadEnv } from '@app/common/env/loadEnv';
loadEnv();

import { createBullMqMessageBus } from '@app/common/messaging/bullmq.module';
import { createApp } from './app.ts';

const PORT = Number(process.env.NOTIFICATION_PORT ?? 3004);

const bus = createBullMqMessageBus({
    redis: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
    },
    prefix: process.env.BUS_PREFIX ?? 'todo',
    concurrency: 10,
});

const { app, notificationModule } = createApp(bus);

const server = app.listen(PORT, async () => {
    console.log(`Notification service is running on port ${PORT}`);
    await notificationModule.start();
});

async function shutdown(signal: string) {
    console.log(`[notification] received ${signal}`);

    await notificationModule.stop();

    server.close(() => {
        console.log('[notification] http server stopped');
        process.exit(0);
    });
}

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});
