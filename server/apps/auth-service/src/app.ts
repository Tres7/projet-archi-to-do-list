import express from 'express';

import { UserService } from './application/UserService.ts';
import { AuthService } from './application/AuthService.ts';

import { AuthController as AuthControllerV2 } from './infrastructure/http/v2/controllers/AuthController.ts';
import { UserController as UserControllerV2 } from './infrastructure/http/v2/controllers/UserController.ts';

import { authMiddleware } from '@app/common/middleware/authMiddleware';
import { AuthController as AuthControllerV1 } from './infrastructure/http/v1/controllers/AuthController.ts';
import { UserController as UserControllerV1 } from './infrastructure/http/v1/controllers/UserController.ts';
import { userRouter } from './infrastructure/http/shared/routes/userRouter.ts';
import { authRouter } from './infrastructure/http/shared/routes/authRouter.ts';
import { loadOpenApiSpec } from './infrastructure/http/shared/openapi/loadOpenApiSpec.ts';
import type { PersistenceContainer } from './infrastructure/persistence/types.ts';

export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const userService = new UserService(repositories.userRepository);
    const authService = new AuthService(repositories.userRepository);

    app.use('/v1/auth', authRouter(new AuthControllerV1(authService)));

    app.use(
        '/v1/users',
        authMiddleware,
        userRouter(new UserControllerV1(userService)),
    );

    app.use('/v2/auth', authRouter(new AuthControllerV2(authService)));

    app.use(
        '/v2/users',
        authMiddleware,
        userRouter(new UserControllerV2(userService)),
    );

    app.use('/auth', authRouter(new AuthControllerV1(authService)));

    app.use(
        '/users',
        authMiddleware,
        userRouter(new UserControllerV1(userService)),
    );

    if (process.env.NODE_ENV !== 'production') {
        app.get('/openapi/v1.json', (_req, res) => res.json(loadOpenApiSpec('v1')));
        app.get('/openapi/v2.json', (_req, res) => res.json(loadOpenApiSpec('v2')));
    }

    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return app;
}