import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { SqliteTodoRepository } from '../../../src/infrastructure/persistence/SqliteTodoRepository.ts';
import { Todo } from '../../../src/domain/entities/Todo.ts';

describe('SqliteTodoRepository', () => {
    let repository: SqliteTodoRepository;

    beforeAll(async () => {
        process.env.SQLITE_DB_LOCATION = ':memory:';
        repository = new SqliteTodoRepository();
        await repository.init();
    });

    afterAll(async () => {
        await repository.teardown();
    });

    beforeEach(async () => {
        const allTodos = await repository.getItems();
        for (const todo of allTodos) {
            await repository.removeItem(todo.id);
        }
    });

    describe('storeItem and getItem', () => {
        it('should store and retrieve a todo', async () => {
            const todo = new Todo('test-id', 'Test Todo', false);

            await repository.storeItem(todo);
            const retrieved = await repository.getItem('test-id');

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe('test-id');
            expect(retrieved?.name).toBe('Test Todo');
            expect(retrieved?.completed).toBe(false);
        });

        it('should return undefined for non-existent id', async () => {
            const retrieved = await repository.getItem('non-existent');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('getItems', () => {
        it('should return all todos', async () => {
            const todo1 = new Todo('1', 'Todo 1', false);
            const todo2 = new Todo('2', 'Todo 2', true);

            await repository.storeItem(todo1);
            await repository.storeItem(todo2);

            const todos = await repository.getItems();

            expect(todos).toHaveLength(2);
            expect(todos.find((t) => t.id === '1')).toBeDefined();
            expect(todos.find((t) => t.id === '2')).toBeDefined();
        });

        it('should return empty array when no todos', async () => {
            const todos = await repository.getItems();
            expect(todos).toHaveLength(0);
        });
    });

    describe('updateItem', () => {
        it('should update a todo', async () => {
            const todo = new Todo('test-id', 'Original', false);
            await repository.storeItem(todo);

            await repository.updateItem('test-id', {
                name: 'Updated',
                completed: true,
            });

            const updated = await repository.getItem('test-id');
            expect(updated?.name).toBe('Updated');
            expect(updated?.completed).toBe(true);
        });
    });

    describe('removeItem', () => {
        it('should remove a todo', async () => {
            const todo = new Todo('test-id', 'To Delete', false);
            await repository.storeItem(todo);

            await repository.removeItem('test-id');

            const retrieved = await repository.getItem('test-id');
            expect(retrieved).toBeUndefined();
        });
    });
});