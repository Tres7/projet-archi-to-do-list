import 'dotenv/config';
import express from 'express';

import { createBullMqMessageBus } from '../../../common/messaging/bullmq.module.ts';
import { NotificationModule } from './notification.module.ts';

const PORT = Number(process.env.PORT ?? 3001);

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

const notificationModule = new NotificationModule(bus, app);

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

app.listen(PORT, async () => {
    console.log(`Notification service is running on port ${PORT}`);
    await notificationModule.start();
});
