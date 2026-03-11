import express from 'express';

import { authMiddleware } from '../../../common/middleware/authMiddleware.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';

import { ProjectService } from './application/ProjectService.ts';
import { projectRouter } from './infrastructure/http/routes/projectRoutes.ts';
import { ProjectController } from './infrastructure/http/controllers/ProjectController.ts';
import { createBullMqMessageBus } from '../../../common/messaging/bullmq.module.ts';

import { ProjectEventHandler } from './application/ProjectEventHandler.ts';
import { ProjectEventConsumer } from './infrastructure/messaging/ProjectEventConsumer.ts';
import { ProjectTaskController } from './infrastructure/http/controllers/ProjectTaskController.ts';
import { ProjectTaskService } from './application/ProjectTaskService.ts';

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

    const projectService = new ProjectService(
        repositories.projectRepository,
        bus,
    );

    const projectTaskService = new ProjectTaskService(
        repositories.projectRepository,
        bus,
    );

    const projectEventHandler = new ProjectEventHandler(
        repositories.projectRepository,
        bus,
    );

    const projectEventConsumer = new ProjectEventConsumer(
        bus,
        projectEventHandler,
    );
    projectEventConsumer.register();

    app.use(
        '/projects',
        authMiddleware,
        projectRouter(
            new ProjectController(projectService),
            new ProjectTaskController(projectTaskService),
        ),
    );

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return {
        app,
        async startModules() {
            await projectEventConsumer.start();
        },
        async stopModules() {
            await projectEventConsumer.stop();
            await bus.close();
        },
    };
}
