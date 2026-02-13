import { jest, describe, it, expect} from '@jest/globals';
import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/repositories/TodoRepository.ts';
import { createDeleteItemHandler } from '../../src/routes/deleteItem';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('deleteItem route', () => {
    it('deletes a todo', async () => {
        const mockRepository = createMockRepository();
        const todoService = new TodoService(mockRepository);
        const handler = createDeleteItemHandler(todoService);

        const req = {
            params: { id: '123' },
        } as any;
        const res = {
            sendStatus: jest.fn(),
        } as any;

        await handler(req, res);

        expect(mockRepository.removeItem).toHaveBeenCalledWith('123');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
});
