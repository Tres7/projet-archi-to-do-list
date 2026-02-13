
import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/repositories/TodoRepository.ts';
import { Todo } from '../../src/domain/entities/Todo';
import { createAddItemHandler } from '../../src/routes/addItem';
import { jest } from '@jest/globals';
import { describe, it, expect} from '@jest/globals';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('addItem route', () => {
    it('it stores item correctly ', async () => {
        const mockRepository = createMockRepository();
        const todoService = new TodoService(mockRepository);
        const handler = createAddItemHandler(todoService);

        const req = { body: { name: 'A sample item' } } as any;
        const res = {
            send: jest.fn(),
        } as any;

        await handler(req, res);

        expect(mockRepository.storeItem).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledTimes(1);

        const sentTodo = res.send.mock.calls[0][0];
        expect(sentTodo).toBeInstanceOf(Todo);
        expect(sentTodo.name).toBe('A sample item');
        expect(sentTodo.completed).toBe(false);
    });
})