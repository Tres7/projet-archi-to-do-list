import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from'os';

import db from '../../src/persistence/sqlite.js';

const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

beforeEach(() => {
    if (fs.existsSync(location)) {
        fs.unlinkSync(location);
    }
});

afterEach(async () => {
    try {
        await db.teardown();
    } catch (_) {}
});

test('it initializes correctly', async () => {
    await db.init();
});

test('it can store and retrieve items', async () => {
    await db.init();

    await db.storeItem(ITEM);

    const items = await db.getItems();
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(ITEM);
});

test('it can update an existing item', async () => {
    await db.init();

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
    await db.init();
    await db.storeItem(ITEM);

    await db.removeItem(ITEM.id);

    const items = await db.getItems();
    expect(items.length).toBe(0);
});

test('it can get a single item', async () => {
    await db.init();
    await db.storeItem(ITEM);

    const item = await db.getItem(ITEM.id);
    expect(item).toEqual(ITEM);
});

test('init creates directory if it does not exist (covers mkdirSync)', async () => {
    const base = path.join(os.tmpdir(), `todos-missing-${process.pid}`);
    const dbPath = path.join(base, 'nested', 'dir', 'todo.db');

    fs.rmSync(base, { recursive: true, force: true });

    jest.resetModules();
    process.env.SQLITE_DB_LOCATION = dbPath;
    process.env.NODE_ENV = 'test';

    const { default: dbLocal } = await import('../../src/persistence/sqlite.js');

    try {
        await dbLocal.init();
        expect(fs.existsSync(path.dirname(dbPath))).toBe(true);
    } finally {
        try {
            await dbLocal.teardown();
        } catch (_) {}
        fs.rmSync(base, { recursive: true, force: true });
    }
});

test('init logs db location when NODE_ENV is not test (covers console.log)', async () => {
    const dbPath = path.join(
        os.tmpdir(),
        `todos-log-${process.pid}-${Date.now()}.db`,
    );

    jest.resetModules();
    process.env.SQLITE_DB_LOCATION = dbPath;
    process.env.NODE_ENV = 'development';

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { default: dbLocal } = await import('../../src/persistence/sqlite.js');

    try {
        await dbLocal.init();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(dbPath));
    } finally {
        try {
            await dbLocal.teardown();
        } catch (_) {}
        logSpy.mockRestore();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    }
});

test('getItem returns undefined when item does not exist', async () => {
    await db.init();
    const item = await db.getItem('00000000-0000-0000-0000-000000000000');
    expect(item).toBeUndefined();
});

test('completed=true is mapped back to boolean true (getItem + getItems)', async () => {
    const itemTrue = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Done',
        completed: true,
    };

    await db.init();
    await db.storeItem(itemTrue);

    expect(await db.getItem(itemTrue.id)).toEqual(itemTrue);
    expect(await db.getItems()).toEqual([itemTrue]);
});

test('updateItem updates name and completed', async () => {
    const itemA = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'A',
        completed: false,
    };

    await db.init();
    await db.storeItem(itemA);

    const updated = { ...itemA, name: 'B', completed: true };
    await db.updateItem(itemA.id, updated);

    expect(await db.getItem(itemA.id)).toEqual(updated);
});
