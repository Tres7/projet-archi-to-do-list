import 'dotenv/config';

import { beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';

import request from 'supertest';

import type {
    UserPayload,
    RunningProjectApp,
    RunningNotificationApp,
} from './helpers/types.ts';
import { bootstrapProjectApp } from './helpers/bootstrapProjectApp.ts';
import { bootstrapNotificationApp } from './helpers/bootstrapNotificationApp.ts';
import { closeServer, openSse, signTestToken } from './helpers/utils.ts';

jest.setTimeout(20_000);

async function createProjectAndGetId(
    app: any,
    token: string,
    name: string,
    description: string,
): Promise<string> {
    await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, description })
        .expect(201);

    const response = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    const project = response.body.find((item: any) => item.name === name);

    if (!project) {
        throw new Error(`Project "${name}" was not found after creation`);
    }

    return String(project.id);
}

describe('project-service <-> notification-service e2e', () => {
    let projectApp: RunningProjectApp;
    let notificationApp: RunningNotificationApp;

    beforeAll(async () => {
        process.env.NOTIFY_DRY_RUN = '1';
        process.env.BUS_PREFIX =
            process.env.BUS_PREFIX || `todo-e2e-${Date.now()}`;

        projectApp = await bootstrapProjectApp();
        notificationApp = await bootstrapNotificationApp();
    });

    afterAll(async () => {
        await projectApp.stopModules();
        await projectApp.closeConnection?.();

        await notificationApp.stop();
        await notificationApp.closeBus();
        await closeServer(notificationApp.server);
    });

    it('creates project and sends project.created notification', async () => {
        const user: UserPayload = {
            userId: `user-create-${Date.now()}`,
            email: 'create@test.local',
            username: 'create-user',
        };

        const token = signTestToken(user);
        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const createdEventPromise = sse.waitFor('project.created');

            const projectId = await createProjectAndGetId(
                projectApp.app,
                token,
                `project-create-${Date.now()}`,
                'e2e create test',
            );

            expect(projectId).toBeTruthy();

            const createdEvent = await createdEventPromise;

            expect(createdEvent.data.type).toBe('project.created');
            expect(createdEvent.data.projectId).toBe(projectId);
            expect(createdEvent.data.refresh).toContain('projects');
        } finally {
            sse.close();
        }
    });

    it('closes project and sends project.closed notification', async () => {
        const user: UserPayload = {
            userId: `user-close-${Date.now()}`,
            email: 'close@test.local',
            username: 'close-user',
        };

        const token = signTestToken(user);

        const projectId = await createProjectAndGetId(
            projectApp.app,
            token,
            `project-close-${Date.now()}`,
            'e2e close test',
        );

        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const closedEventPromise = sse.waitFor('project.closed');

            await request(projectApp.app)
                .post(`/projects/${projectId}/close`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const closedEvent = await closedEventPromise;

            expect(closedEvent.data.type).toBe('project.closed');
            expect(closedEvent.data.projectId).toBe(projectId);
            expect(closedEvent.data.refresh).toContain('projects');

            const response = await request(projectApp.app)
                .get('/projects')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const project = response.body.find(
                (item: any) => item.id === projectId,
            );

            expect(project).toBeDefined();
            expect(String(project.status).toUpperCase()).toBe('CLOSED');
        } finally {
            sse.close();
        }
    });

    it('deletes project and sends project.deleted notification', async () => {
        const user: UserPayload = {
            userId: `user-delete-${Date.now()}`,
            email: 'delete@test.local',
            username: 'delete-user',
        };

        const token = signTestToken(user);

        const projectId = await createProjectAndGetId(
            projectApp.app,
            token,
            `project-delete-${Date.now()}`,
            'e2e delete test',
        );

        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const deletedEventPromise = sse.waitFor('project.deleted');

            await request(projectApp.app)
                .delete(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const deletedEvent = await deletedEventPromise;

            expect(deletedEvent.data.type).toBe('project.deleted');
            expect(deletedEvent.data.projectId).toBe(projectId);
            expect(deletedEvent.data.refresh).toContain('projects');

            const response = await request(projectApp.app)
                .get('/projects')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const project = response.body.find(
                (item: any) => item.id === projectId,
            );

            expect(project).toBeUndefined();
        } finally {
            sse.close();
        }
    });
});
