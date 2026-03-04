import { jest, beforeEach, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('uuid', () => ({ v4: jest.fn() }));

const { v4: uuid } = (await import('uuid')) as any;
const { TaskService } =
    (await import('../../src/modules/task/application/TaskService')) as any;
const { Task } =
    (await import('../../src/modules/task/domain/entities/Task')) as any;

let repo: any;
let taskService: any;

const USER_ID = 'user-123';

beforeEach(() => {
    jest.clearAllMocks();

    repo = {
        getItems: jest.fn(),
        getItem: jest.fn(),
        storeItem: jest.fn(),
        updateItem: jest.fn(),
        removeItem: jest.fn(),
    };

    taskService = new TaskService(repo);
});

describe('TodoService', () => {
    it('createTodo: creates a todo and stores it', async () => {
        const id = 'generated-uuid';
        uuid.mockReturnValue(id);

        repo.storeItem.mockResolvedValue(undefined);

        const result = await taskService.createTodo('Buy milk', USER_ID);

        expect(uuid).toHaveBeenCalledTimes(1);
        expect(repo.storeItem).toHaveBeenCalledTimes(1);
        expect(repo.storeItem).toHaveBeenCalledWith(
            new Task(id, 'Buy milk', false, USER_ID),
        );
        expect(result).toEqual(new Task(id, 'Buy milk', false, USER_ID));
    });

    it('updateTodo: updates a todo and returns the updated item', async () => {
        const updated = new Task('1', 'Updated', true, USER_ID);

        repo.updateItem.mockResolvedValue(undefined);
        repo.getItem.mockResolvedValue(updated);

        const result = await taskService.updateTodo(
            '1',
            'Updated',
            true,
            USER_ID,
        );

        expect(repo.updateItem).toHaveBeenCalledWith('1', {
            name: 'Updated',
            completed: true,
        });
        expect(repo.getItem).toHaveBeenCalledWith('1');
        expect(result).toEqual(updated);
    });

    it('updateTodo: throws if todo not found', async () => {
        repo.getItem.mockResolvedValue(undefined);

        await expect(
            taskService.updateTodo('nonexistent', 'Name', false, USER_ID),
        ).rejects.toThrow('Resource not found');
    });

    it('updateTodo: throws if user is unauthorized', async () => {
        repo.getItem.mockResolvedValue(
            new Task('1', 'To update', false, 'other-user'),
        );

        await expect(
            taskService.updateTodo('1', 'Name', false, USER_ID),
        ).rejects.toThrow('Unauthorized');
    });

    it('deleteTodo: removes the todo', async () => {
        repo.removeItem.mockResolvedValue(undefined);
        repo.getItem.mockResolvedValue(
            new Task('1', 'To delete', false, USER_ID),
        );

        await taskService.deleteTodo('1', USER_ID);

        expect(repo.removeItem).toHaveBeenCalledWith('1');
    });

    it('deleteTodo: throws if todo not found', async () => {
        repo.getItem.mockResolvedValue(undefined);

        await expect(
            taskService.deleteTodo('nonexistent', USER_ID),
        ).rejects.toThrow('Resource not found');
    });

    it('deleteTodo: throws if user is unauthorized', async () => {
        repo.getItem.mockResolvedValue(
            new Task('1', 'To delete', false, 'other-user'),
        );

        await expect(taskService.deleteTodo('1', USER_ID)).rejects.toThrow(
            'Unauthorized',
        );
    });

    it('getAllTodos: returns all todos', async () => {
        const items = [new Task('1', 'Todo 1', false, USER_ID)];
        repo.getItems.mockResolvedValue(items);

        const result = await taskService.getAllTodos(USER_ID);

        expect(repo.getItems).toHaveBeenCalledTimes(1);
        expect(result).toEqual(items);
    });
});
