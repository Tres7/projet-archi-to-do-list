import 'dotenv/config';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import request from 'supertest';

import type { ProjectDetailsDto } from '../../common/contracts/queries/project-details.dto.ts';
import type {
    UserPayload,
    RunningTaskApp,
    RunningProjectApp,
    RunningNotificationApp,
} from './helpers/types.ts';
import { bootstrapTaskApp } from './helpers/bootstrapTaskApp.ts';
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

async function getProjectDetails(
    app: any,
    token: string,
    projectId: string,
): Promise<ProjectDetailsDto> {
    const response = await request(app)
        .get(`/projects/${projectId}/details`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    return response.body as ProjectDetailsDto;
}

async function waitForProjectDetails(
    app: any,
    token: string,
    projectId: string,
    predicate: (details: ProjectDetailsDto) => boolean,
    timeoutMs = 7000,
): Promise<ProjectDetailsDto> {
    const startedAt = Date.now();
    let lastDetails: ProjectDetailsDto | undefined;

    while (Date.now() - startedAt < timeoutMs) {
        lastDetails = await getProjectDetails(app, token, projectId);

        if (predicate(lastDetails)) {
            return lastDetails;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(
        `Timeout while waiting for project details update: ${JSON.stringify(lastDetails)}`,
    );
}

async function createTaskAndWaitForSync(
    app: any,
    token: string,
    projectId: string,
    name: string,
    description: string,
): Promise<string> {
    const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name, description })
        .expect(201);

    const taskId = String(response.body.resourceId);

    await waitForProjectDetails(
        app,
        token,
        projectId,
        (details) =>
            details.openTaskCount === 1 &&
            details.tasks.some(
                (task) => task.id === taskId && task.status === 'OPEN',
            ),
    );

    return taskId;
}

describe('project-service <-> task-service <-> notification-service task e2e', () => {
    let projectApp: RunningProjectApp;
    let taskApp: RunningTaskApp;
    let notificationApp: RunningNotificationApp;

    beforeAll(async () => {
        process.env.NOTIFY_DRY_RUN = '1';
        process.env.DB_DRIVER = 'memory';
        process.env.BUS_PREFIX = `todo-e2e-task-${Date.now()}`;

        projectApp = await bootstrapProjectApp();
        taskApp = await bootstrapTaskApp();
        notificationApp = await bootstrapNotificationApp();
    });

    afterAll(async () => {
        await taskApp?.stopModules?.();
        await taskApp?.closeConnection?.();

        await projectApp?.stopModules?.();
        await projectApp?.closeConnection?.();

        await notificationApp?.stop?.();
        await notificationApp?.closeBus?.();

        if (notificationApp?.server) {
            await closeServer(notificationApp.server);
        }
    });

    it('creates task through project-service and sends task.created notification', async () => {
        const user: UserPayload = {
            userId: `user-task-create-${Date.now()}`,
            email: 'task-create@test.local',
            username: 'task-create-user',
        };

        const token = signTestToken(user);
        const projectId = await createProjectAndGetId(
            projectApp.app,
            token,
            `project-task-create-${Date.now()}`,
            'task create e2e test',
        );

        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const createdEventPromise = sse.waitFor('task.created');

            const createResponse = await request(projectApp.app)
                .post(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: `task-create-${Date.now()}`,
                    description: 'e2e task create description',
                })
                .expect(201);

            const taskId = String(createResponse.body.resourceId);

            expect(createResponse.body.accepted).toBe(true);
            expect(taskId).toBeTruthy();

            const createdEvent = await createdEventPromise;

            expect(createdEvent.data.type).toBe('task.created');
            expect(createdEvent.data.projectId).toBe(projectId);
            expect(createdEvent.data.taskId).toBe(taskId);
            expect(createdEvent.data.refresh).toContain('project-details');

            const details = await waitForProjectDetails(
                projectApp.app,
                token,
                projectId,
                (projectDetails) =>
                    projectDetails.openTaskCount === 1 &&
                    projectDetails.tasks.some(
                        (task) =>
                            task.id === taskId &&
                            task.status === 'OPEN' &&
                            task.description === 'e2e task create description',
                    ),
            );

            const createdTask = details.tasks.find((task) => task.id === taskId);

            expect(createdTask).toBeDefined();
            expect(createdTask?.status).toBe('OPEN');
        } finally {
            sse.close();
        }
    });

    it('toggles task status and sends task.updated notification', async () => {
        const user: UserPayload = {
            userId: `user-task-toggle-${Date.now()}`,
            email: 'task-toggle@test.local',
            username: 'task-toggle-user',
        };

        const token = signTestToken(user);
        const projectId = await createProjectAndGetId(
            projectApp.app,
            token,
            `project-task-toggle-${Date.now()}`,
            'task toggle e2e test',
        );

        const taskId = await createTaskAndWaitForSync(
            projectApp.app,
            token,
            projectId,
            `task-toggle-${Date.now()}`,
            'e2e task toggle description',
        );

        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const closeEventPromise = sse.waitFor('task.updated');

            const closeResponse = await request(projectApp.app)
                .patch(`/projects/${projectId}/tasks/${taskId}/toggle-status`)
                .set('Authorization', `Bearer ${token}`)
                .expect(202);

            expect(closeResponse.body.accepted).toBe(true);
            expect(String(closeResponse.body.resourceId)).toBe(taskId);

            const closedEvent = await closeEventPromise;

            expect(closedEvent.data.type).toBe('task.updated');
            expect(closedEvent.data.projectId).toBe(projectId);
            expect(closedEvent.data.taskId).toBe(taskId);
            expect(closedEvent.data.refresh).toContain('project-details');

            const closedDetails = await waitForProjectDetails(
                projectApp.app,
                token,
                projectId,
                (projectDetails) =>
                    projectDetails.openTaskCount === 0 &&
                    projectDetails.tasks.some(
                        (task) => task.id === taskId && task.status === 'DONE',
                    ),
            );

            expect(
                closedDetails.tasks.find((task) => task.id === taskId)?.status,
            ).toBe('DONE');

            const reopenEventPromise = sse.waitFor('task.updated');

            const reopenResponse = await request(projectApp.app)
                .patch(`/projects/${projectId}/tasks/${taskId}/toggle-status`)
                .set('Authorization', `Bearer ${token}`)
                .expect(202);

            expect(reopenResponse.body.accepted).toBe(true);
            expect(String(reopenResponse.body.resourceId)).toBe(taskId);

            const reopenedEvent = await reopenEventPromise;

            expect(reopenedEvent.data.type).toBe('task.updated');
            expect(reopenedEvent.data.projectId).toBe(projectId);
            expect(reopenedEvent.data.taskId).toBe(taskId);
            expect(reopenedEvent.data.refresh).toContain('project-details');

            const reopenedDetails = await waitForProjectDetails(
                projectApp.app,
                token,
                projectId,
                (projectDetails) =>
                    projectDetails.openTaskCount === 1 &&
                    projectDetails.tasks.some(
                        (task) => task.id === taskId && task.status === 'OPEN',
                    ),
            );

            expect(
                reopenedDetails.tasks.find((task) => task.id === taskId)
                    ?.status,
            ).toBe('OPEN');
        } finally {
            sse.close();
        }
    });

    it('deletes task through project-service and sends task.deleted notification', async () => {
        const user: UserPayload = {
            userId: `user-task-delete-${Date.now()}`,
            email: 'task-delete@test.local',
            username: 'task-delete-user',
        };

        const token = signTestToken(user);
        const projectId = await createProjectAndGetId(
            projectApp.app,
            token,
            `project-task-delete-${Date.now()}`,
            'task delete e2e test',
        );

        const taskId = await createTaskAndWaitForSync(
            projectApp.app,
            token,
            projectId,
            `task-delete-${Date.now()}`,
            'e2e task delete description',
        );

        const sse = openSse(notificationApp.baseUrl, user.userId);

        try {
            await sse.waitFor('connected');

            const deletedEventPromise = sse.waitFor('task.deleted');

            const deleteResponse = await request(projectApp.app)
                .delete(`/projects/${projectId}/tasks/${taskId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(202);

            expect(deleteResponse.body.accepted).toBe(true);
            expect(String(deleteResponse.body.resourceId)).toBe(taskId);

            const deletedEvent = await deletedEventPromise;

            expect(deletedEvent.data.type).toBe('task.deleted');
            expect(deletedEvent.data.projectId).toBe(projectId);
            expect(deletedEvent.data.taskId).toBe(taskId);
            expect(deletedEvent.data.refresh).toContain('project-details');

            const details = await waitForProjectDetails(
                projectApp.app,
                token,
                projectId,
                (projectDetails) =>
                    projectDetails.openTaskCount === 0 &&
                    projectDetails.tasks.every((task) => task.id !== taskId),
            );

            expect(details.tasks.find((task) => task.id === taskId)).toBeUndefined();
        } finally {
            sse.close();
        }
    });
});
