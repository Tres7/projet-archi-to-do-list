import 'dotenv/config';
import express from 'express';

import { createBullMqMessageBus } from '../../../src/infrastructure/messaging/bullmq/bullmq.module.ts';
import { NotificationModule } from './notification.module.ts';

const PORT = process.env.PORT ?? 3001;

const bus = createBullMqMessageBus({
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
    },
    prefix: 'todo',
    concurrency: 10,
});

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

const notificationModule = new NotificationModule(bus, app);

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
