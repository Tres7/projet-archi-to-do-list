import express, { type Express } from 'express';

import type { MessageBus } from '../../../common/messaging/MessageBus.ts';
import { NotificationModule } from './notification.module.ts';

type CreateAppResult = {
    app: Express;
    notificationModule: NotificationModule;
};

export function createApp(bus: MessageBus): CreateAppResult {
    const app = express();

    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.status(200).json({ ok: true });
    });

    const notificationModule = new NotificationModule(bus, app);

    return {
        app,
        notificationModule,
    };
}
