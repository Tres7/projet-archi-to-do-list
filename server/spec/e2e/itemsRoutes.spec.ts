import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request, { agent } from 'supertest';

import { createApp } from '../../src/app.ts';
import { PersistenceFactory } from '../../src/infrastructure/persistence/PersistenceFactory.ts';
import type { IDatabaseConnection } from '../../src/infrastructure/persistence/IDatabaseConnection.ts';

describe('e2e: todo routes', () => {
    let app: ReturnType<typeof createApp>;
    let connection: IDatabaseConnection;

    const todoOwner = { username: 'test', password: 'test' };
    const otherUser = { username: 'other', password: 'other' };

    let authTokenTodoOwner: string;
    let authTokenOtherUser: string;

    beforeAll(async () => {
        const container = await PersistenceFactory.create('sqlite');
        connection = container.connection;
        await connection.init();
        await connection.clearDatabase();
        app = createApp(container);

        // register test user
        await request(app).post('/auth/register').send(todoOwner).expect(200);
        await request(app).post('/auth/register').send(otherUser).expect(200);

        // login test user
        const authTodoOwner = await request(app)
            .post('/auth/login')
            .send(todoOwner)
            .expect(200);
        authTokenTodoOwner = authTodoOwner.body.token;

        const authOtherUser = await request(app)
            .post('/auth/login')
            .send(otherUser)
            .expect(200);
        authTokenOtherUser = authOtherUser.body.token;
    });

    afterAll(async () => {
        await connection.clearDatabase();
        await connection.teardown().catch(() => {});
    });

    // test('POST /items without auth', async () => {
    //     const res = await request(app)
    //         .post('/items')
    //         .send({ title: 'Test todo' })
    //         .expect(401);

    //     expect(res.body).toEqual({
    //         error: 'Unauthorized',
    //     });
    // });

    test('POST /items with empty name', async () => {
        const res = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: ' ' })
            .expect(400);

        expect(res.body).toEqual({
            error: 'name is required',
        });
    });

    test('POST /items with auth', async () => {
        const res = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Test todo' })
            .expect(200);

        expect(res.body).toEqual({
            id: expect.any(String),
            name: 'Test todo',
            completed: false,
            userId: expect.any(String),
        });
    });

    test('GET /items with auth', async () => {
        const res = await request(app)
            .get('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .expect(200);

        expect(res.body).toEqual([
            {
                id: expect.any(String),
                name: 'Test todo',
                completed: false,
                userId: expect.any(String),
            },
        ]);
    });

    test('GET /items if other user', async () => {
        const res = await request(app)
            .get('/items')
            .set('Authorization', `Bearer ${authTokenOtherUser}`)
            .expect(200);

        expect(res.body).toEqual([]);
    });

    test('PUT /items/:id with empty name', async () => {
        const createRes = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Test todo' })
            .expect(200);

        const res = await request(app)
            .put(`/items/${createRes.body.id}`)
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: ' ' })
            .expect(400);

        expect(res.body).toEqual({
            error: 'name is required',
        });
    });

    test('PUT /items/:id with auth and ownership', async () => {
        const createRes = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Test todo' })
            .expect(200);

        const res = await request(app)
            .put(`/items/${createRes.body.id}`)
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Updated todo', completed: true })
            .expect(200);

        expect(res.body).toEqual({
            id: createRes.body.id,
            name: 'Updated todo',
            completed: true,
            userId: expect.any(String),
        });
    });

    test('PUT /items/:id with wrong id', async () => {
        const res = await request(app)
            .put(`/items/wrong-id`)
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Updated todo', completed: true })
            .expect(404);
    });

    test('PUT /items/:id with auth but no ownership', async () => {
        const createRes = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Test todo' })
            .expect(200);

        await request(app)
            .put(`/items/${createRes.body.id}`)
            .set('Authorization', `Bearer ${authTokenOtherUser}`)
            .send({ name: 'Updated todo', completed: true })
            .expect(403);
    });

    test('DELETE /items/:id with auth and ownership', async () => {
        const createRes = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Todo for deletion' })
            .expect(200);

        await request(app)
            .delete(`/items/${createRes.body.id}`)
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .expect(200);
    });

    test('DELETE /items/:id with wrong id', async () => {
        await request(app)
            .delete(`/items/wrong-id`)
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .expect(404);
    });

    test('DELETE /items/:id with auth but no ownership', async () => {
        const createRes = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${authTokenTodoOwner}`)
            .send({ name: 'Todo for deletion' })
            .expect(200);

        await request(app)
            .delete(`/items/${createRes.body.id}`)
            .set('Authorization', `Bearer ${authTokenOtherUser}`)
            .expect(403);
    });
});
