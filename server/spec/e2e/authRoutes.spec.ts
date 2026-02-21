import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../../src/app.ts';
import { PersistenceFactory } from '../../src/infrastructure/persistence/PersistenceFactory.ts';
import type { IDatabaseConnection } from '../../src/infrastructure/persistence/IDatabaseConnection.ts';

describe('e2e: register and login', () => {
    let app: ReturnType<typeof createApp>;
    let connection: IDatabaseConnection;

    beforeAll(async () => {
        const container = await PersistenceFactory.create('memory');
        connection = container.connection;
        await connection.init();
        await connection.clearDatabase();
        app = createApp(container);
    });

    afterAll(async () => {
        await connection.teardown().catch(() => {});
    });

    test('POST /register with missing fields', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send()
            .expect(400);

        expect(res.body).toEqual({
            error: 'username and password are required',
        });

        const res2 = await request(app)
            .post('/auth/register')
            .send({ username: 'test' })
            .expect(400);

        expect(res2.body).toEqual({
            error: 'username and password are required',
        });

        const res3 = await request(app)
            .post('/auth/register')
            .send({ password: 'test' })
            .expect(400);

        expect(res3.body).toEqual({
            error: 'username and password are required',
        });
    });

    test('POST /register', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ username: 'test', password: 'test' })
            .expect(200);

        expect(res.status).toBe(200);
        // expect(res.body).toEqual({ ok: true });
    });

    test('POST /register with existing username', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ username: 'test', password: 'test' })
            .expect(409);

        expect(res.body).toEqual({
            error: 'User with that username already exists',
        });
    });

    test('POST /login', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'test', password: 'test' })
            .expect(200);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ token: expect.any(String) });
    });

    test('POST /login with wrong credentials', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'test', password: 'wrong' })
            .expect(401);

        expect(res.body).toEqual({
            message: 'Invalid credentials provided',
        });
    });

    test('POST /login unregistered user', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'unknown', password: 'test' })
            .expect(401);

        expect(res.body).toEqual({
            message: 'Invalid credentials provided',
        });
    });
});
