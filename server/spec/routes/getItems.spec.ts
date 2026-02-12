/*import { jest } from '@jest/globals';

const ITEMS = [{ id: 12345 }];

jest.unstable_mockModule('../../src/persistence/index', () => ({
    default: {
        getItems: jest.fn(),
    },
}));

const { default: db } = (await import('../../src/persistence/index')) as any;
const { default: getItems } =
    (await import('../../src/routes/getItems')) as any;

test('it gets items correctly', async () => {
    const req = {};
    const res = { send: jest.fn() };
    db.getItems.mockReturnValue(Promise.resolve(ITEMS));

    await getItems(req, res);

    expect(db.getItems.mock.calls.length).toBe(1);
    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(ITEMS);
});*/

import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/TodoRepository';
import { Todo } from '../../src/domain/entities/Todo';
import { createGetItemsHandler } from '../../src/routes/getItems';
import { jest, describe, it, expect } from '@jest/globals';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('getItems route', () => {
    it('retrieves all todos', async () => {
        const mockTodos = [
            new Todo('1', 'Todo 1', false),
            new Todo('2', 'Todo 2', true),
        ];

        const mockRepository = createMockRepository();
        mockRepository.getItems.mockResolvedValue(mockTodos);

        const todoService = new TodoService(mockRepository);
        const handler = createGetItemsHandler(todoService);

        const req = {} as any;
        const res = {
            send: jest.fn(),
        } as any;

        await handler(req, res);

        expect(mockRepository.getItems).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith(mockTodos);
    });
});
