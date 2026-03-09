import express from 'express';

import { UserService } from './application/UserService.ts';
import { AuthService } from './application/AuthService.ts';

import { userRouter } from './infrastructure/http/routes/userRouter.ts';
import { authRouter } from './infrastructure/http/routes/authRouter.ts';

import { authMiddleware } from '../../../common/middleware/authMiddleware.ts';

import type { PersistenceContainer } from './infrastructure/persistence/types.ts';
import { AuthController } from './infrastructure/http/controllers/AuthController.ts';
import { UserController } from './infrastructure/http/controllers/UserController.ts';

export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const userService = new UserService(repositories.userRepository);
    const authService = new AuthService(repositories.userRepository);

    app.use('/auth', authRouter(new AuthController(authService)));

    app.use(
        '/users',
        authMiddleware,
        userRouter(new UserController(userService)),
    );

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return {
        app,
    };
}
