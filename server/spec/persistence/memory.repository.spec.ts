import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { Todo } from '../../src/domain/entities/Todo.ts';
import { InMemoryConnection } from '../../src/persistence/memory/InMemoryConnection.ts';
import { InMemoryTodoRepository } from '../../src/persistence/memory/InMemoryTodoRepository.ts';

describe('InMemoryTodoRepository contract', () => {
    let connection: InMemoryConnection;
    let todoRepository: InMemoryTodoRepository;

    const ITEM = new Todo(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'Test',
        false,
    );

    beforeEach(async () => {
        connection = new InMemoryConnection();
        await connection.init();
        todoRepository = new InMemoryTodoRepository(connection);
    });

    afterEach(async () => {
        try {
            await connection.teardown();
        } catch (_) {}
    });

    test('it initializes correctly', async () => {
        const items = await todoRepository.getItems();
        expect(Array.isArray(items)).toBe(true);
    });

    test('it can store and retrieve items', async () => {
        await todoRepository.storeItem(ITEM);
        const items = await todoRepository.getItems();
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(ITEM);
    });

    test('it can update an existing item', async () => {
        expect((await todoRepository.getItems()).length).toBe(0);

        await todoRepository.storeItem(ITEM);

        await todoRepository.updateItem(ITEM.id, {
            name: ITEM.name,
            completed: !ITEM.completed,
        });

        const items = await todoRepository.getItems();
        expect(items.length).toBe(1);
        expect(items[0].completed).toBe(true);
    });

    test('it can remove an existing item', async () => {
        await todoRepository.storeItem(ITEM);
        await todoRepository.removeItem(ITEM.id);
        expect((await todoRepository.getItems()).length).toBe(0);
    });

    test('it can get a single item', async () => {
        await todoRepository.storeItem(ITEM);
        expect(await todoRepository.getItem(ITEM.id)).toEqual(ITEM);
    });

    test('getItem returns undefined when item does not exist', async () => {
        expect(
            await todoRepository.getItem(
                '00000000-0000-0000-0000-000000000000',
            ),
        ).toBeUndefined();
    });

    test('completed=true is mapped back to boolean true (getItem + getItems)', async () => {
        const itemTrue = new Todo(
            '11111111-1111-1111-1111-111111111111',
            'Done',
            true,
        );
        await todoRepository.storeItem(itemTrue);

        expect(await todoRepository.getItem(itemTrue.id)).toEqual(itemTrue);
        expect(await todoRepository.getItems()).toEqual([itemTrue]);
    });

    test('updateItem updates name and completed', async () => {
        const itemA = new Todo(
            '22222222-2222-2222-2222-222222222222',
            'A',
            false,
        );
        await todoRepository.storeItem(itemA);

        await todoRepository.updateItem(itemA.id, {
            name: 'B',
            completed: true,
        });
        expect(await todoRepository.getItem(itemA.id)).toEqual(
            new Todo(itemA.id, 'B', true),
        );
    });
});
