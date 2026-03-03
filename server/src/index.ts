import 'dotenv/config';
import { createApp } from './app.ts';
import { persistence } from './infrastructure/persistence/index.ts';
import { NotificationModule } from './modules/notification/notification.module.ts';
import { createBullMqMessaging } from './infrastructure/messaging/bullmq/bullmq.module.ts';

const PORT = Number(process.env.PORT ?? 3000);

const messaging = createBullMqMessaging({
    redis: {
        host: process.env.REDIS_HOST!,
        port: Number(process.env.REDIS_PORT!),
    },
});

const publisher = messaging.createPublisher({
    routes: {
        'task.created': ['notification-service'],
        'task.status-changed': ['notification-service'],
        'project.closed': ['notification-service'],
        'task.deleted': ['notification-service'],
    },
});

const notificationSubscriber = messaging.createSubscriber(
    'notification-service',
);
const notificationModule = new NotificationModule(notificationSubscriber);

const { connection } = persistence;
const app = createApp(persistence, publisher);

connection
    .init()
    .then(async () => {
        await notificationModule.start();
        app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
