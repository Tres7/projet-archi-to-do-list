import { describe, expect, jest, test } from '@jest/globals';
import type { Request, Response, Router } from 'express';
import type { UserController } from '../../../../../src/infrastructure/http/controllers/UserController.ts';
import { userRouter } from '../../../../../src/infrastructure/http/routes/userRouter.ts';
import { requestStub, ResponseStub } from '../../../helpers/HttpStubs.ts';

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
    const routeHandler = layer?.route?.stack.find(
        (item) => item.method === method,
    )?.handle;

    if (!routeHandler) throw new Error(`Missing route: ${method} ${path}`);
    return routeHandler;
}

describe('userRouter', () => {
    test('registers user routes', async () => {
        const calls: string[] = [];
        const controller = {
            getUserByName: jest.fn((_req: Request, res: Response) => {
                calls.push('getUserByName');
                res.json({ ok: true });
            }),
            getUserById: jest.fn((_req: Request, res: Response) => {
                calls.push('getUserById');
                res.json({ ok: true });
            }),
            getUsers: jest.fn((_req: Request, res: Response) => {
                calls.push('getUsers');
                res.json({ ok: true });
            }),
            updateUsername: jest.fn((_req: Request, res: Response) => {
                calls.push('updateUsername');
                res.json({ ok: true });
            }),
            changeUserPassword: jest.fn((_req: Request, res: Response) => {
                calls.push('changeUserPassword');
                res.json({ ok: true });
            }),
            deleteUser: jest.fn((_req: Request, res: Response) => {
                calls.push('deleteUser');
                res.json({ ok: true });
            }),
        } as unknown as UserController;
        const router = userRouter(controller);

        await handler(
            router,
            '/username/:name',
            'get',
        )(
            requestStub({ params: { name: 'Alice' } }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/:id',
            'get',
        )(requestStub({ params: { id: '1' } }), new ResponseStub() as never);
        await handler(
            router,
            '/',
            'get',
        )(requestStub({}), new ResponseStub() as never);
        await handler(
            router,
            '/:id/name',
            'patch',
        )(requestStub({ params: { id: '1' } }), new ResponseStub() as never);
        await handler(
            router,
            '/:id/password',
            'patch',
        )(requestStub({ params: { id: '1' } }), new ResponseStub() as never);
        await handler(
            router,
            '/:id',
            'delete',
        )(requestStub({ params: { id: '1' } }), new ResponseStub() as never);

        expect(calls).toEqual([
            'getUserByName',
            'getUserById',
            'getUsers',
            'updateUsername',
            'changeUserPassword',
            'deleteUser',
        ]);
    });
});
