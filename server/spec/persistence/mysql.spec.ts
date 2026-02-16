import { beforeEach, afterEach, test, expect } from '@jest/globals';
import { Todo } from '../../src/domain/entities/Todo.ts';

process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_USER = 'test_user';
process.env.MYSQL_PASSWORD = 'test_password';
process.env.MYSQL_DB = 'test_todos';

import db from '../../src/persistence/mysql.ts';

const ITEM = new Todo(
    '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    'Test',
    false,
);

beforeEach(async () => {
    await db.init();
    const items = await db.getItems();
    for (const item of items) {
        await db.removeItem(item.id);
    }
});

afterEach(async () => {
    try {
        await db.teardown();
    } catch (_) {}
});

test('it initializes correctly', async () => {
    const items = await db.getItems();
    expect(Array.isArray(items)).toBe(true);
});

test('it can store and retrieve items', async () => {
    await db.storeItem(ITEM);

    const items = await db.getItems();
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(ITEM);
});

test('it can update an existing item', async () => {
    const initialItems = await db.getItems();
    expect(initialItems.length).toBe(0);

    await db.storeItem(ITEM);

    await db.updateItem(
        ITEM.id,
        Object.assign({}, ITEM, { completed: !ITEM.completed }),
    );

    const items = await db.getItems();
    expect(items.length).toBe(1);
    expect(items[0].completed).toBe(!ITEM.completed);
});

test('it can remove an existing item', async () => {
    await db.storeItem(ITEM);

    await db.removeItem(ITEM.id);

    const items = await db.getItems();
    expect(items.length).toBe(0);
});

test('it can get a single item', async () => {
    await db.storeItem(ITEM);

    const item = await db.getItem(ITEM.id);
    expect(item).toEqual(ITEM);
});

test('getItem returns undefined when item does not exist', async () => {
    const item = await db.getItem('00000000-0000-0000-0000-000000000000');
    expect(item).toBeUndefined();
});

test('completed=true is mapped back to boolean true (getItem + getItems)', async () => {
    const itemTrue = new Todo(
        '11111111-1111-1111-1111-111111111111',
        'Done',
        true,
    );

    await db.storeItem(itemTrue);

    expect(await db.getItem(itemTrue.id)).toEqual(itemTrue);
    expect(await db.getItems()).toEqual([itemTrue]);
});

test('updateItem updates name and completed', async () => {
    const itemA = new Todo(
        '22222222-2222-2222-2222-222222222222',
        'A',
        false,
    );

    await db.storeItem(itemA);

    const updated = { ...itemA, name: 'B', completed: true };
    await db.updateItem(itemA.id, updated);

    expect(await db.getItem(itemA.id)).toEqual(updated);
});