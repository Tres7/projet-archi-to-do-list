import 'dotenv/config';
import express from 'express';
import { NotificationModule } from './notification.module.ts';
import { createBullMqMessaging } from './infrastructure/messaging/bullmq/bullmq.module.ts';

const PORT = Number(3001);

const messaging = createBullMqMessaging({
    redis: {
        host: process.env.REDIS_HOST! || 'localhost',
        port: Number(process.env.REDIS_PORT!) || 6379,
    },
});

const notificationSubscriber = messaging.createSubscriber(
    'notification-service',
);
const notificationModule = new NotificationModule(notificationSubscriber);

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.listen(PORT, async () => {
    console.log(`Notification service is running on port ${PORT}`);
    await notificationModule.start();
});
