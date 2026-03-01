import express from 'express';

import { TodoService } from './application/Service/TodoService.ts';
import { UserService } from './modules/auth/application/UserService.ts';
import { AuthService } from './modules/auth/application/AuthService.ts';

import { todoRouter } from './infrastructure/http/routes/todoRouter.ts';
import { userRouter } from './modules/auth/infrastructure/http/routes/userRouter.ts';
import { authRouter } from './modules/auth/infrastructure/http/routes/authRouter.ts';

import { TodoController } from './infrastructure/http/controllers/TodoController.ts';

import { authMiddleware } from './common/middleware/authMiddleware.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';
import { AuthController } from './modules/auth/infrastructure/http/controllers/AuthController.ts';
import { UserController } from './modules/auth/infrastructure/http/controllers/UserController.ts';

export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const todoService = new TodoService(repositories.todoRepository);
    const userService = new UserService(repositories.userRepository);
    const authService = new AuthService(repositories.userRepository);

    app.use('/auth', authRouter(new AuthController(authService)));
    app.use(
        '/users',
        authMiddleware,
        userRouter(new UserController(userService)),
    );
    app.use(
        '/items',
        authMiddleware,
        todoRouter(new TodoController(todoService)),
    );

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return app;
}
