import express from 'express';

import { TaskService } from './modules/task/application/TaskService.ts';
import { UserService } from './modules/auth/application/UserService.ts';
import { AuthService } from './modules/auth/application/AuthService.ts';

import { userRouter } from './modules/auth/infrastructure/http/routes/userRouter.ts';
import { authRouter } from './modules/auth/infrastructure/http/routes/authRouter.ts';

import { authMiddleware } from '../common/middleware/authMiddleware.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';
import { AuthController } from './modules/auth/infrastructure/http/controllers/AuthController.ts';
import { UserController } from './modules/auth/infrastructure/http/controllers/UserController.ts';
import { ProjectService } from './modules/project/application/ProjectService.ts';
import { projectRouter } from './modules/project/infrastructure/http/routes/projectRoutes.ts';
import { ProjectController } from './modules/project/infrastructure/http/controllers/ProjectController.ts';
import { createBullMqMessageBus } from './infrastructure/messaging/bullmq/bullmq.module.ts';

import { TaskEventConsumer } from './modules/task/infrastructure/messaging/TaskEventConsumer.ts';
import { ProjectEventHandler } from './modules/project/application/ProjectEventHandler.ts';
import { ProjectEventConsumer } from './modules/project/infrastructure/messaging/ProjectEventConsumer.ts';
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

    const projectService = new ProjectService(
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

    const userService = new UserService(repositories.userRepository);
    const authService = new AuthService(repositories.userRepository);

    app.use('/auth', authRouter(new AuthController(authService)));

    app.use(
        '/users',
        authMiddleware,
        userRouter(new UserController(userService)),
    );

    app.use(
        '/projects',
        authMiddleware,
        projectRouter(new ProjectController(projectService)),
    );

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return {
        app,
        async startModules() {
            await projectEventConsumer.start();
            await taskEventConsumer.start();
        },
        async stopModules() {
            await projectEventConsumer.stop();
            await taskEventConsumer.stop();
            await bus.close();
        },
    };
}
