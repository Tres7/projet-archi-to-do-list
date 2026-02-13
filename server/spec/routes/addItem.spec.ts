/*import { jest } from '@jest/globals';

const ITEM = { id: 12345 };

jest.unstable_mockModule('uuid', () => ({ v4: jest.fn() }));

jest.unstable_mockModule('../../src/persistence/index.js', () => ({
    default: {
        removeItem: jest.fn(),
        storeItem: jest.fn(),
        getItem: jest.fn(),
    },
}));

const { v4: uuid } = (await import('uuid')) as any;
const { default: db } = (await import('../../src/persistence/index')) as any;
const { default: addItem } = (await import('../../src/routes/addItem')) as any;

test('it stores item correctly', async () => {
    const id = 'something-not-a-uuid';
    const name = 'A sample item';
    const req = { body: { name } };
    const res = { send: jest.fn() };

    uuid.mockReturnValue(id);

    await addItem(req, res);

    const expectedItem = { id, name, completed: false };

    expect(db.storeItem.mock.calls.length).toBe(1);
    expect(db.storeItem.mock.calls[0][0]).toEqual(expectedItem);
    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(expectedItem);
});
*/

import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/TodoRepository';
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