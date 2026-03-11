import 'dotenv/config';

import { beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { EventSource } from 'eventsource';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

jest.setTimeout(20_000);

type UserPayload = {
    userId: string;
    email: string;
    username: string;
};

type RunningProjectApp = {
    app: any;
    stopModules: () => Promise<void>;
    closeConnection?: () => Promise<void>;
};

type RunningNotificationApp = {
    app: any;
    server: Server;
    baseUrl: string;
    stop: () => Promise<void>;
    closeBus: () => Promise<void>;
};

type SseEvent = {
    event: string;
    data: any;
};

function signTestToken(user: UserPayload): string {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email,
            username: user.username,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
        },
    );
}

function listen(app: any): Promise<{ server: Server; baseUrl: string }> {
    return new Promise((resolve) => {
        const server = app.listen(0, '127.0.0.1', () => {
            const address = server.address() as AddressInfo;

            resolve({
                server,
                baseUrl: `http://127.0.0.1:${address.port}`,
            });
        });
    });
}

function closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function openSse(baseUrl: string, userId: string) {
    const source = new EventSource(
        `${baseUrl}/notifications/events?userId=${encodeURIComponent(userId)}`,
    );

    function waitFor(eventName: string, timeoutMs = 7000): Promise<SseEvent> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(
                    new Error(
                        `Timeout while waiting for SSE event "${eventName}"`,
                    ),
                );
            }, timeoutMs);

            const onMessage = (event: any) => {
                cleanup();

                try {
                    resolve({
                        event: eventName,
                        data: JSON.parse(event.data),
                    });
                } catch (error) {
                    reject(error);
                }
            };

            const onError = (error: unknown) => {
                cleanup();
                reject(error);
            };

            const cleanup = () => {
                clearTimeout(timer);
                source.removeEventListener(
                    eventName,
                    onMessage as unknown as EventListener,
                );
                source.removeEventListener(
                    'error',
                    onError as unknown as EventListener,
                );
            };

            source.addEventListener(
                eventName,
                onMessage as unknown as EventListener,
            );
            source.addEventListener(
                'error',
                onError as unknown as EventListener,
            );
        });
    }

    return {
        source,
        waitFor,
        close() {
            source.close();
        },
    };
}

async function bootstrapProjectApp(): Promise<RunningProjectApp> {
    const { persistence } =
        await import('../../apps/project-service/src/infrastructure/persistence/index.ts');
    const { createApp } = await import('../../apps/project-service/src/app.ts');

    await persistence.connection.init();

    const { app, startModules, stopModules } = createApp(persistence);
    await startModules();

    const closeConnection = async () => {
        const connection = persistence.connection as any;

        try {
            if (typeof connection.close === 'function') {
                await connection.close();
            }
        } catch {}

        try {
            if (typeof connection.end === 'function') {
                await connection.end();
            }
        } catch {}

        try {
            if (typeof connection.destroy === 'function') {
                await connection.destroy();
            }
        } catch {}

        try {
            if (connection.pool && typeof connection.pool.end === 'function') {
                await connection.pool.end();
            }
        } catch {}

        try {
            if (
                connection.connection &&
                typeof connection.connection.end === 'function'
            ) {
                await connection.connection.end();
            }
        } catch {}
    };

    return {
        app,
        stopModules,
        closeConnection,
    };
}

async function bootstrapNotificationApp(): Promise<RunningNotificationApp> {
    const { createBullMqMessageBus } =
        await import('../../common/messaging/bullmq.module.ts');
    const { createApp } =
        await import('../../apps/notification-service/src/app.ts');

    const bus = createBullMqMessageBus({
        redis: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
        },
        prefix: process.env.BUS_PREFIX ?? 'todo',
        concurrency: 10,
    });

    const { app, notificationModule } = createApp(bus);

    await notificationModule.start();

    const runtime = await listen(app);

    return {
        app,
        server: runtime.server,
        baseUrl: runtime.baseUrl,
        stop: () => notificationModule.stop(),
        closeBus: () => bus.close(),
    };
}

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
