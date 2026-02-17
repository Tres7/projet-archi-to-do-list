import {
    describe,
    beforeAll,
    beforeEach,
    afterAll,
    test,
    expect,
    jest,
} from '@jest/globals';
import { Todo } from '../../src/domain/entities/Todo.ts';
import { MysqlConnection } from '../../src/persistence/MysqlConnection.ts';
import { MysqlTodoRepository } from '../../src/persistence/MysqlTodoRepository.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';
const describeIf = RUN_MYSQL ? describe : describe.skip;

describeIf('MysqlTodoRepository contract', () => {
    let connection: MysqlConnection;
    let todoRepository: MysqlTodoRepository;
    let logSpy: ReturnType<typeof jest.spyOn> | null = null;

    const ITEM = new Todo(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'Test',
        false,
    );

    beforeAll(async () => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        connection = new MysqlConnection();
        await connection.init();
        todoRepository = new MysqlTodoRepository(connection);
    });

    beforeEach(async () => {
        await connection.query('DELETE FROM todo_items');
    });

    afterAll(async () => {
        try {
            await connection.teardown();
        } catch (_) {}

        logSpy?.mockRestore();
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
