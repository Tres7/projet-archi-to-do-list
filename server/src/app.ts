import express from 'express';

import { TaskService } from './modules/task/application/TaskService.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';

import { createBullMqMessageBus } from '../common/messaging/bullmq.module.ts';

import { TaskEventConsumer } from './modules/task/infrastructure/messaging/TaskEventConsumer.ts';
import { TaskEventHandler } from './modules/task/application/TaskEventHandler.ts';

export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const bus = createBullMqMessageBus({
        redis: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
        },
        prefix: 'todo',
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
