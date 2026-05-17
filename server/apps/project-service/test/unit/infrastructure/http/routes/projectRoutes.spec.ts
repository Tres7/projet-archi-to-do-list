import { describe, expect, jest, test } from '@jest/globals';
import type { Request, Response, Router } from 'express';
import type { ProjectController } from '../../../../../src/infrastructure/http/controllers/ProjectController.ts';
import type { ProjectTaskController } from '../../../../../src/infrastructure/http/controllers/ProjectTaskController.ts';
import { projectRouter } from '../../../../../src/infrastructure/http/routes/projectRoutes.ts';
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

describe('projectRouter', () => {
    test('registers project and task routes', async () => {
        const calls: string[] = [];
        const projectController = {
            getProjects: jest.fn((_req: Request, res: Response) => {
                calls.push('getProjects');
                res.json({ ok: true });
            }),
            getProjectDetails: jest.fn((_req: Request, res: Response) => {
                calls.push('getProjectDetails');
                res.json({ ok: true });
            }),
            addProject: jest.fn((_req: Request, res: Response) => {
                calls.push('addProject');
                res.json({ ok: true });
            }),
            closeProject: jest.fn((_req: Request, res: Response) => {
                calls.push('closeProject');
                res.json({ ok: true });
            }),
            deleteProject: jest.fn((_req: Request, res: Response) => {
                calls.push('deleteProject');
                res.json({ ok: true });
            }),
        } as unknown as ProjectController;
        const taskController = {
            createTask: jest.fn((_req: Request, res: Response) => {
                calls.push('createTask');
                res.json({ ok: true });
            }),
            toggleTaskStatus: jest.fn((_req: Request, res: Response) => {
                calls.push('toggleTaskStatus');
                res.json({ ok: true });
            }),
            deleteTask: jest.fn((_req: Request, res: Response) => {
                calls.push('deleteTask');
                res.json({ ok: true });
            }),
        } as unknown as ProjectTaskController;

        const router = projectRouter(projectController, taskController);

        await handler(
            router,
            '/',
            'get',
        )(requestStub({}), new ResponseStub() as never);
        await handler(
            router,
            '/:projectId/details',
            'get',
        )(
            requestStub({ params: { projectId: 'project-1' } }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/',
            'post',
        )(requestStub({}), new ResponseStub() as never);
        await handler(
            router,
            '/:projectId/close',
            'post',
        )(
            requestStub({ params: { projectId: 'project-1' } }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/:projectId',
            'delete',
        )(
            requestStub({ params: { projectId: 'project-1' } }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/:projectId/tasks',
            'post',
        )(
            requestStub({ params: { projectId: 'project-1' } }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/:projectId/tasks/:taskId/toggle-status',
            'patch',
        )(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }),
            new ResponseStub() as never,
        );
        await handler(
            router,
            '/:projectId/tasks/:taskId',
            'delete',
        )(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }),
            new ResponseStub() as never,
        );

        expect(calls).toEqual([
            'getProjects',
            'getProjectDetails',
            'addProject',
            'closeProject',
            'deleteProject',
            'createTask',
            'toggleTaskStatus',
            'deleteTask',
        ]);
    });
});
