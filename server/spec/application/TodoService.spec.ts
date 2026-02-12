import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TodoService } from '../../src/application/Service/TodoService';

import type { TodoRepository } from '../../src/domain/repositories/TodoRepository.ts';
import { Todo } from '../../src/domain/entities/Todo';

const createMockRepository = (): jest.Mocked<TodoRepository> => ({
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
});

describe('TodoService', () => {
    let todoService: TodoService;
    let mockRepository: jest.Mocked<TodoRepository>;

    beforeEach(() => {
        mockRepository = createMockRepository();
        todoService = new TodoService(mockRepository);
    });

    describe('createTodo', () => {
        it('should create a new todo with generated id', async () => {
            const name = 'Test todo';

            const result = await todoService.createTodo(name);

            expect(result).toBeInstanceOf(Todo);
            expect(result.name).toBe(name);
            expect(result.completed).toBe(false);
            expect(result.id).toBeDefined();
            expect(mockRepository.storeItem).toHaveBeenCalledTimes(1);
            expect(mockRepository.storeItem).toHaveBeenCalledWith(result);
        });
    });

    describe('updateTodo', () => {
        it('should update an existing todo', async () => {
            const existingTodo = new Todo('123', 'Old name', false);
            mockRepository.getItem.mockResolvedValue(existingTodo);

            const result = await todoService.updateTodo('123', 'New name', true);

            expect(result).toBeDefined();
            expect(result?.name).toBe('New name');
            expect(result?.completed).toBe(true);
            expect(mockRepository.updateItem).toHaveBeenCalledWith('123', {
                name: 'New name',
                completed: true,
            });
        });

        it('should return undefined if todo does not exist', async () => {
            mockRepository.getItem.mockResolvedValue(undefined);

            const result = await todoService.updateTodo('999', 'Name', true);

            expect(result).toBeUndefined();
            expect(mockRepository.updateItem).not.toHaveBeenCalled();
        });
    });

    describe('deleteTodo', () => {
        it('should delete a todo', async () => {
            await todoService.deleteTodo('123');

            expect(mockRepository.removeItem).toHaveBeenCalledWith('123');
        });
    });

    describe('getAllTodos', () => {
        it('should return all todos', async () => {
            const todos = [
                new Todo('1', 'Todo 1', false),
                new Todo('2', 'Todo 2', true),
            ];
            mockRepository.getItems.mockResolvedValue(todos);

            const result = await todoService.getAllTodos();

            expect(result).toEqual(todos);
            expect(mockRepository.getItems).toHaveBeenCalledTimes(1);
        });
    });

    describe('getTodoById', () => {
        it('should return a todo by id', async () => {
            const todo = new Todo('123', 'Test', false);
            mockRepository.getItem.mockResolvedValue(todo);

            const result = await todoService.getTodoById('123');

            expect(result).toEqual(todo);
            expect(mockRepository.getItem).toHaveBeenCalledWith('123');
        });
    });
});