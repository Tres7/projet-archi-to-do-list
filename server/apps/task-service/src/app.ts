import express from 'express';

import { TaskService } from './application/TaskService.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';

import { createBullMqMessageBus } from '../../../common/messaging/bullmq.module.ts';

import { TaskEventConsumer } from './infrastructure/messaging/TaskEventConsumer.ts';
import { TaskEventHandler } from './application/TaskEventHandler.ts';

export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const bus = createBullMqMessageBus({
        redis: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
        },
        prefix: process.env.BUS_PREFIX ?? 'todo',
        concurrency: 10,
    });

    const taskService = new TaskService(repositories.taskRepository);
    const taskEventHandler = new TaskEventHandler(
        repositories.taskRepository,
        bus,
    );
    const taskEventConsumer = new TaskEventConsumer(
        bus,
        taskEventHandler,
        taskService,
    );
    taskEventConsumer.register();

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return {
        app,
        async startModules() {
            await taskEventConsumer.start();
        },
        async stopModules() {
            await taskEventConsumer.stop();
            await bus.close();
        },
    };
}
