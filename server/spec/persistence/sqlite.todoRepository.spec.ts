import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { Todo } from '../../src/domain/entities/Todo.ts';
import { SqliteConnection } from '../../src/persistence/sqlite/SqliteConnection.ts';
import { SqliteTodoRepository } from '../../src/persistence/sqlite/SqliteTodoRepository.ts';

describe('SqliteTodoRepository contract', () => {
    let dbPath: string;
    let connection: SqliteConnection;
    let todoRepository: SqliteTodoRepository;

    const ITEM = new Todo(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'Test',
        false,
    );

    beforeEach(async () => {
        dbPath = path.join(
            os.tmpdir(),
            `todo-sqlite-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
        );

        connection = new SqliteConnection(dbPath);
        todoRepository = new SqliteTodoRepository(connection);

        await connection.init();
    });

    afterEach(async () => {
        try {
            await connection.teardown();
        } catch (_) {}

        if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
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
        const initialItems = await todoRepository.getItems();
        expect(initialItems.length).toBe(0);

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

        const items = await todoRepository.getItems();
        expect(items.length).toBe(0);
    });

    test('it can get a single item', async () => {
        await todoRepository.storeItem(ITEM);

        const item = await todoRepository.getItem(ITEM.id);
        expect(item).toEqual(ITEM);
    });

    test('getItem returns undefined when item does not exist', async () => {
        const item = await todoRepository.getItem(
            '00000000-0000-0000-0000-000000000000',
        );
        expect(item).toBeUndefined();
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
