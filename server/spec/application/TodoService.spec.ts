import { jest, beforeEach, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('uuid', () => ({ v4: jest.fn() }));

const { v4: uuid } = (await import('uuid')) as any;
const { TodoService } =
    (await import('../../src/application/Service/TodoService')) as any;
const { Todo } = (await import('../../src/domain/entities/Todo')) as any;

let repo: any;
let todoService: any;

beforeEach(() => {
    jest.clearAllMocks();

    repo = {
        getItems: jest.fn(),
        getItem: jest.fn(),
        storeItem: jest.fn(),
        updateItem: jest.fn(),
        removeItem: jest.fn(),
    };

    todoService = new TodoService(repo);
});

describe('TodoService', () => {
    it('createTodo: creates a todo and stores it', async () => {
        const id = 'generated-uuid';
        uuid.mockReturnValue(id);

        repo.storeItem.mockResolvedValue(undefined);

        const result = await todoService.createTodo('Buy milk');

        expect(uuid).toHaveBeenCalledTimes(1);
        expect(repo.storeItem).toHaveBeenCalledTimes(1);
        expect(repo.storeItem).toHaveBeenCalledWith(
            new Todo(id, 'Buy milk', false),
        );
        expect(result).toEqual(new Todo(id, 'Buy milk', false));
    });

    it('updateTodo: updates a todo and returns the updated item', async () => {
        const updated = new Todo('1', 'Updated', true);

        repo.updateItem.mockResolvedValue(undefined);
        repo.getItem.mockResolvedValue(updated);

        const result = await todoService.updateTodo('1', 'Updated', true);

        expect(repo.updateItem).toHaveBeenCalledWith('1', {
            name: 'Updated',
            completed: true,
        });
        expect(repo.getItem).toHaveBeenCalledWith('1');
        expect(result).toEqual(updated);
    });

    it('deleteTodo: removes the todo', async () => {
        repo.removeItem.mockResolvedValue(undefined);

        await todoService.deleteTodo('1');

        expect(repo.removeItem).toHaveBeenCalledWith('1');
    });

    it('getAllTodos: returns all todos', async () => {
        const items = [new Todo('1', 'Todo 1', false)];
        repo.getItems.mockResolvedValue(items);

        const result = await todoService.getAllTodos();

        expect(repo.getItems).toHaveBeenCalledTimes(1);
        expect(result).toEqual(items);
    });
});
