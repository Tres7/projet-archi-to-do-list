import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { createApp } from '../../apps/auth-service/src/app.ts';
import { PersistenceFactory } from '../../apps/auth-service/src/infrastructure/persistence/PersistenceFactory.ts';
import type { IDatabaseConnection } from '../../apps/auth-service/src/infrastructure/persistence/IDatabaseConnection.ts';

describe('e2e: user routes', () => {
    let app: express.Application;
    let connection: IDatabaseConnection;

    let testUserRegisterData = {
        username: 'test',
        email: 'test@example.com',
        password: 'test',
    };

    let testUserCredentials = { username: 'test', password: 'test' };
    let testUserId: string;
    let testUserToken: string;

    beforeAll(async () => {
        const container = await PersistenceFactory.create('memory');
        connection = container.connection;
        await connection.init();
        await connection.clearDatabase();
        app = createApp(container);

        await request(app)
            .post('/auth/register')
            .send(testUserRegisterData)
            .expect(200);

        const loginRes = await request(app)
            .post('/auth/login')
            .send(testUserCredentials)
            .expect(200);

        testUserToken = loginRes.body.token;
        const decoded = jwt.verify(testUserToken, process.env.JWT_SECRET!);
        testUserId = (decoded as any).userId;
    });

    afterAll(async () => {
        await connection.clearDatabase();
        await connection.teardown().catch(() => {});
    });

    test('GET /users without auth', async () => {
        const res = await request(app).get('/users').expect(401);

        expect(res.body).toEqual({
            error: 'Unauthorized',
        });
    });

    test('GET /users', async () => {
        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(res.body).toEqual([
            {
                email: testUserRegisterData.email,
                id: testUserId,
                userName: 'test',
            },
        ]);
    });

    test('GET /users/:id', async () => {
        const res = await request(app)
            .get(`/users/${testUserId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(res.body).toEqual({
            email: testUserRegisterData.email,
            id: testUserId,
            userName: 'test',
        });
    });

    test('GET /users/:id - user not found', async () => {
        await request(app)
            .get(`/users/nonexistent-id`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(404);
    });

    test('GET /users/username/:username', async () => {
        const res = await request(app)
            .get(`/users/username/${testUserCredentials.username}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(res.body).toEqual({
            id: testUserId,
            userName: testUserCredentials.username,
            email: testUserRegisterData.email,
        });
    });

    test('GET /users/username/:username - user not found', async () => {
        await request(app)
            .get(`/users/username/nonexistent-username`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(404);
    });

    test('PATCH /users/:id/name - missing username', async () => {
        const res = await request(app)
            .patch(`/users/${testUserId}/name`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({})
            .expect(400);

        expect(res.body).toEqual({
            error: 'username is required',
        });
    });

    test('PATCH /users/:id/name', async () => {
        const res = await request(app)
            .patch(`/users/${testUserId}/name`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ username: 'newName' })
            .expect(200);

        expect(res.body).toEqual({
            message: 'Username updated successfully',
        });

        const getRes = await request(app)
            .get(`/users/${testUserId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(getRes.body).toEqual({
            id: testUserId,
            userName: 'newName',
            email: testUserRegisterData.email,
        });
    });

    test('PATCH /users/:id/name - user not found', async () => {
        const res = await request(app)
            .patch(`/users/nonexistent-id/name`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ username: 'newName' })
            .expect(404);

        expect(res.body).toEqual({
            error: 'User not found',
        });
    });

    test('PATCH /users/:id/name - username already exists', async () => {
        // create another user
        await request(app)
            .post('/auth/register')
            .send({
                username: 'existingUser',
                password: 'password',
                email: 'existingUser@example.com',
            })
            .expect(200);

        const res = await request(app)
            .patch(`/users/${testUserId}/name`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ username: 'existingUser' })
            .expect(409);

        expect(res.body).toEqual({
            error: 'User with that username already exists',
        });
    });

    test('PATCH /users/:id/password - missing password', async () => {
        const res = await request(app)
            .patch(`/users/${testUserId}/password`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({})
            .expect(400);

        expect(res.body).toEqual({
            error: 'password is required',
        });
    });

    test('PATCH /users/:id/password', async () => {
        const res = await request(app)
            .patch(`/users/${testUserId}/password`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ password: 'newPassword' })
            .expect(201);

        expect(res.body).toEqual({
            message: 'Password changed successfully',
        });
    });

    test('PATCH /users/:id/password - user not found', async () => {
        const res = await request(app)
            .patch(`/users/nonexistent-id/password`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ password: 'newPassword' })
            .expect(404);

        expect(res.body).toEqual({
            error: 'User not found',
        });
    });

    test('DELETE /users/:id', async () => {
        const res = await request(app)
            .delete(`/users/${testUserId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(204);

        await request(app)
            .get(`/users/${testUserId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(404);
    });
});
