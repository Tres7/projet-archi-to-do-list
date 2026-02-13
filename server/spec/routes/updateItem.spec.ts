/*import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/persistence/index', () => ({
    default: {
        getItem: jest.fn(),
        updateItem: jest.fn(),
    },
}));

const { default: db } = (await import('../../src/persistence/index')) as any;
const { default: updateItem } =
    (await import('../../src/routes/updateItem')) as any;

const ITEM = { id: 12345 };

test('it updates items correctly', async () => {
    const req = {
        params: { id: 1234 },
        body: { name: 'New title', completed: false },
    };
    const res = { send: jest.fn() };

    db.getItem.mockReturnValue(Promise.resolve(ITEM));

    await updateItem(req, res);

    expect(db.updateItem.mock.calls.length).toBe(1);
    expect(db.updateItem.mock.calls[0][0]).toBe(req.params.id);
    expect(db.updateItem.mock.calls[0][1]).toEqual({
        name: 'New title',
        completed: false,
    });

    expect(db.getItem.mock.calls.length).toBe(1);
    expect(db.getItem.mock.calls[0][0]).toBe(req.params.id);

    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(ITEM);
});*/

import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/TodoRepository';
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
