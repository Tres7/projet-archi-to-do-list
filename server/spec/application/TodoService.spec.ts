import { jest, beforeEach, describe, it, expect} from '@jest/globals';

jest.unstable_mockModule('uuid', () => ({ v4: jest.fn() }));

jest.unstable_mockModule('../../src/persistence/index', () => ({
    default: {
        getItems: jest.fn(),
        getItem: jest.fn(),
        storeItem: jest.fn(),
        updateItem: jest.fn(),
        removeItem: jest.fn(),
    },
}));

const { v4: uuid } = (await import('uuid')) as any;
const { default: db } = (await import('../../src/persistence/index')) as any;
const { TodoService } = (await import('../../src/application/Service/TodoService')) as any;

let todoService: InstanceType<typeof TodoService>;

beforeEach(() => {
    jest.clearAllMocks();
    todoService = new TodoService();
});


describe('create Todo', () => {
    it('creates a todo and stores it', async () => {
        const id = 'generated-uuid';
        uuid.mockReturnValue(id);

        const result = await todoService.createTodo('Buy milk');

        expect(uuid).toHaveBeenCalledTimes(1);
        expect(db.storeItem).toHaveBeenCalledWith({
            id,
            name: 'Buy milk',
            completed: false,
        });
        expect(result).toEqual({ id, name: 'Buy milk', completed: false });
    });
});

describe('update Todo', () => {
    it('updates a todo and returns the updated item', async () => {
        const updated = { id: '1', name: 'Updated', completed: true };
        db.getItem.mockResolvedValue(updated);

        const result = await todoService.updateTodo('1', 'Updated', true);

        expect(db.updateItem).toHaveBeenCalledWith('1', {
            name: 'Updated',
            completed: true,
        });
        expect(db.getItem).toHaveBeenCalledWith('1');
        expect(result).toEqual(updated);
    });
});

describe('deleteTodo', () => {
    it('removes the todo', async () => {
        await todoService.deleteTodo('1');

        expect(db.removeItem).toHaveBeenCalledWith('1');
    });
});

describe('getAllTodos', () => {
    it('returns all todos', async () => {
        const items = [{ id: '1', name: 'Todo 1', completed: false }];
        db.getItems.mockResolvedValue(items);

        const result = await todoService.getAllTodos();

        expect(db.getItems).toHaveBeenCalledTimes(1);
        expect(result).toEqual(items);
    });
});
