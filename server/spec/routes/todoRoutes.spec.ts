import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { TodoRepository } from '../../src/domain/repositories/TodoRepository';
import { TodoService } from '../../src/application/Service/TodoService';
import { createTodoRouter } from '../../src/routes/todoRoutes';
import { Todo } from '../../src/domain/entities/Todo';
import express from 'express';
import request from 'supertest';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('Todo Routes', () => {
    let app: express.Application;
    let mockRepository: jest.Mocked<TodoRepository>;

    beforeEach(() => {
        mockRepository = createMockRepository();
        const todoService = new TodoService(mockRepository);
        const router = createTodoRouter(todoService);

        app = express();
        app.use(express.json());
        app.use('/items', router);
    });

    describe('GET /items', () => {
        it('returns all todos', async () => {
            const todos = [new Todo('1', 'Test', false)];
            mockRepository.getItems.mockResolvedValue(todos);

            const response = await request(app).get('/items');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(mockRepository.getItems).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /items', () => {
        it('creates a new todo and returns 201', async () => {
            mockRepository.storeItem.mockResolvedValue();

            const response = await request(app)
                .post('/items')
                .send({ name: 'New todo' });

            expect(response.status).toBe(201);
            expect(mockRepository.storeItem).toHaveBeenCalledTimes(1);
            expect(response.body.name).toBe('New todo');
            expect(response.body.completed).toBe(false);
        });
    });

    describe('PUT /items/:id', () => {
        it('updates a todo', async () => {
            const updatedTodo = new Todo('1', 'Updated', true);
            mockRepository.getItem.mockResolvedValue(updatedTodo);
            mockRepository.updateItem.mockResolvedValue();

            const response = await request(app)
                .put('/items/1')
                .send({ name: 'Updated', completed: true });

            expect(response.status).toBe(200);
            expect(mockRepository.updateItem).toHaveBeenCalledTimes(1);
        });

        it('returns 404 if todo not found', async () => {
            mockRepository.getItem.mockResolvedValue(undefined);

            const response = await request(app)
                .put('/items/999')
                .send({ name: 'Updated', completed: true });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /items/:id', () => {
        it('deletes a todo and returns 204', async () => {
            mockRepository.removeItem.mockResolvedValue();

            const response = await request(app).delete('/items/1');

            expect(response.status).toBe(204);
            expect(mockRepository.removeItem).toHaveBeenCalledWith('1');
        });
    });
});