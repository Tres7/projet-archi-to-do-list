import { describe, expect, jest, test } from '@jest/globals';
import type { Request, Response, Router } from 'express';
import type { AuthController } from '../../../../../../src/infrastructure/http/v1/controllers/AuthController.ts';
import { authRouter } from '../../../../../../src/infrastructure/http/shared/routes/authRouter.ts';
import { requestStub, ResponseStub } from '../../../../helpers/HttpStubs.ts';

type Handler = (req: Request, res: Response) => unknown;
type RouterLayer = {
    route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ method: string; handle: Handler }>;
    };
};

function handler(router: Router, path: string, method: string): Handler {
    const layer = (router as unknown as { stack: RouterLayer[] }).stack.find(
        (item) => item.route?.path === path && item.route.methods[method],
    );
    const matchingHandlers = layer?.route?.stack.filter(
        (item) => item.method === method,
    );
    const routeHandler = matchingHandlers?.[matchingHandlers.length - 1]?.handle;

    if (!routeHandler) throw new Error(`Missing route: ${method} ${path}`);
    return routeHandler;
}

describe('authRouter', () => {
    test('registers login and register routes', async () => {
        const controller = {
            login: jest.fn<(req: Request, res: Response) => Promise<void>>(
                async (_req, res) => {
                    res.status(200).json({ ok: 'login' });
                },
            ),
            register: jest.fn<(req: Request, res: Response) => Promise<void>>(
                async (_req, res) => {
                    res.status(201).json({ ok: 'register' });
                },
            ),
        } as unknown as AuthController;
        const router = authRouter(controller);

        const loginResponse = new ResponseStub();
        await handler(
            router,
            '/login',
            'post',
        )(requestStub({}), loginResponse as never);

        const registerResponse = new ResponseStub();
        await handler(
            router,
            '/register',
            'post',
        )(requestStub({}), registerResponse as never);

        expect(loginResponse.jsonBody).toEqual({ ok: 'login' });
        expect(registerResponse.statusCode).toBe(201);
        expect(registerResponse.jsonBody).toEqual({ ok: 'register' });
    });
});
