/*import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/persistence/index', () => ({
    default: {
        removeItem: jest.fn(),
        getItem: jest.fn(),
    },
}));

const { default: db } = (await import('../../src/persistence/index')) as any;
const { default: deleteItem } =
    (await import('../../src/routes/deleteItem')) as any;

const ITEM = { id: 12345 };

test('it removes item correctly', async () => {
    const req = { params: { id: 12345 } };
    const res = { sendStatus: jest.fn() };

    await deleteItem(req, res);

    expect(db.removeItem.mock.calls.length).toBe(1);
    expect(db.removeItem.mock.calls[0][0]).toBe(req.params.id);
    expect(res.sendStatus.mock.calls[0].length).toBe(1);
    expect(res.sendStatus.mock.calls[0][0]).toBe(200);
});*/
import { jest, describe, it, expect} from '@jest/globals';
import { TodoService } from '../../src/application/Service/TodoService';
import type { TodoRepository } from '../../src/domain/TodoRepository';
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
