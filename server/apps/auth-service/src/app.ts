import express from 'express';

import { UserService } from './application/UserService.ts';
import { AuthService } from './application/AuthService.ts';

import { AuthController as AuthControllerV2 } from './infrastructure/http/v2/controllers/AuthController.ts';
import { UserController as UserControllerV2 } from './infrastructure/http/v2/controllers/UserController.ts';
import { userRouter as userRouterV2 } from './infrastructure/http/v2/routes/userRouter.ts';
import { authRouter as authRouterV2 } from './infrastructure/http/v2/routes/authRouter.ts';

import { authMiddleware } from '@app/common/middleware/authMiddleware';
import { AuthController as AuthControllerV1 } from './infrastructure/http/v1/controllers/AuthController.ts';
import { UserController as UserControllerV1 } from './infrastructure/http/v1/controllers/UserController.ts';
import { userRouter as userRouterV1 } from './infrastructure/http/v1/routes/userRouter.ts';
import { authRouter as authRouterV1 } from './infrastructure/http/v1/routes/authRouter.ts';
import type { PersistenceContainer } from './infrastructure/persistence/types.ts';


export function createApp(container: PersistenceContainer) {
    const app = express();
    app.use(express.json());

    const { repositories } = container;

    const userService = new UserService(repositories.userRepository);
    const authService = new AuthService(repositories.userRepository);

    app.use('/v1/auth', authRouterV1(new AuthControllerV1(authService)));

    app.use(
        '/v1/users',
        authMiddleware,
        userRouterV1(new UserControllerV1(userService)),
    );

    
    app.use('/v2/auth', authRouterV2(new AuthControllerV2(authService)));

    app.use(
        '/v2/users',
        authMiddleware,
        userRouterV2(new UserControllerV2(userService)),
    );

    app.use('/auth', authRouterV1(new AuthControllerV1(authService)));
    
    app.use(
        '/users',
        authMiddleware,
        userRouterV1(new UserControllerV1(userService)),
    );
    app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

    return app;
}
