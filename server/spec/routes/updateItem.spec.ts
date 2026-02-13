import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/repositories/TodoRepository.ts';
import { Todo } from '../../src/domain/entities/Todo';
import { createUpdateItemHandler } from '../../src/routes/updateItem';
import { jest, describe, it, expect } from '@jest/globals';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('updateItem route', () => {
    it('updates an existing todo', async () => {
        const existingTodo = new Todo('123', 'Old name', false);
        const updatedTodo = new Todo('123', 'New name', true);

        const mockRepository = createMockRepository();
        mockRepository.getItem.mockResolvedValue(existingTodo);

        const todoService = new TodoService(mockRepository);
        const handler = createUpdateItemHandler(todoService);

        const req = {
            params: { id: '123' },
            body: { name: 'New name', completed: true },
        } as any;
        const res = {
            send: jest.fn(),
        } as any;

        await handler(req, res);

        expect(mockRepository.getItem).toHaveBeenCalledWith('123');
        expect(mockRepository.updateItem).toHaveBeenCalledWith('123', {
            name: 'New name',
            completed: true,
        });
        expect(res.send).toHaveBeenCalledTimes(1);
    });
});
