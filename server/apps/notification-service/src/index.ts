import 'dotenv/config';

import { createBullMqMessageBus } from '../../../common/messaging/bullmq.module.ts';
import { createApp } from './app.ts';

const PORT = Number(process.env.NOTIFICATION_PORT ?? 3004);

const bus = createBullMqMessageBus({
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
    },
    prefix: 'todo',
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
