import {
    describe,
    test,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
} from '@jest/globals';

import fs from 'fs';

import type { IDatabaseConnection } from '../../../../src/infrastructure/persistence/IDatabaseConnection.ts';
import { PersistenceFactory } from '../../../../src/infrastructure/persistence/PersistenceFactory.ts';
import type { TaskRepository } from '../../../../src/modules/task/domain/repositories/TaskRepository.ts';
import { Task } from '../../../../src/modules/task/domain/entities/Task.ts';
import type { PersistenceDriver } from '../../../../src/infrastructure/persistence/types.ts';
import { User } from '../../../../src/modules/auth/domain/entities/User.ts';
import type { UserRepository } from '../../../../src/modules/auth/domain/repositories/UserRepository.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';

const DRIVERS: PersistenceDriver[] = RUN_MYSQL
    ? ['memory', 'sqlite', 'mysql']
    : ['memory', 'sqlite'];

describe.each(DRIVERS)('TaskRepository contract (%s)', (driver) => {
    let connection: IDatabaseConnection;
    let taskRepository: TaskRepository;
    let userRepository: UserRepository;

    let sqlitePath: string | null = null;

    const USER = new User('test', 'testuser', 'hashedpassword');
    const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');
    const PROJECT_ID = 'project-1';

    const ITEM = new Task(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'Test',
        'Task description',
        'opened',
        CREATED_AT,
        USER.id,
        PROJECT_ID,
    );

    beforeAll(async () => {
        const persistence = await PersistenceFactory.create(driver);
        connection = persistence.connection;
        taskRepository = persistence.repositories.taskRepository;
        userRepository = persistence.repositories.userRepository;
        await connection.init();
    });

    beforeEach(async () => {
        await connection.clearDatabase();
        await userRepository.createUser(USER);
    });

    afterAll(async () => {
        await connection.clearDatabase();
        await connection.teardown().catch(() => {});
        if (sqlitePath) {
            try {
                fs.unlinkSync(sqlitePath);
            } catch {}
        }
    });

    test('it initializes correctly', async () => {
        const items = await taskRepository.getItems(USER.id);
        expect(Array.isArray(items)).toBe(true);
    });

    test('it trhows when trying to use repository before initialization', async () => {
        const persistence = await PersistenceFactory.create(driver);
        const repo = persistence.repositories.taskRepository;

        await expect(repo.getItems(USER.id)).rejects.toThrow();
        await expect(repo.storeItem(ITEM)).rejects.toThrow();
    });

    test('it can store and retrieve items', async () => {
        await taskRepository.storeItem(ITEM);
        const items = await taskRepository.getItems(USER.id);
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(ITEM);
    });

    test('it can update an existing item', async () => {
        expect((await taskRepository.getItems(USER.id)).length).toBe(0);

        await taskRepository.storeItem(ITEM);

        await taskRepository.updateItem(ITEM.id, {
            name: ITEM.name,
            description: ITEM.description,
            status: 'closed',
        });

        const items = await taskRepository.getItems(USER.id);
        expect(items.length).toBe(1);
        expect(items[0].status).toBe('closed');
    });

    test('it can remove an existing item', async () => {
        await taskRepository.storeItem(ITEM);
        await taskRepository.removeItem(ITEM.id);
        expect((await taskRepository.getItems(USER.id)).length).toBe(0);
    });

    test('it can get a single item', async () => {
        await taskRepository.storeItem(ITEM);
        expect(await taskRepository.getItem(ITEM.id)).toEqual(ITEM);
    });

    test('getItem returns undefined when item does not exist', async () => {
        await expect(
            taskRepository.getItem('00000000-0000-0000-0000-000000000000'),
        ).resolves.toBeUndefined();
    });

    test('completed=true is mapped back to boolean true (getItem + getItems)', async () => {
        const itemTrue = new Task(
            '11111111-1111-1111-1111-111111111111',
            'Done',
            'Closed task',
            'closed',
            CREATED_AT,
            USER.id,
            PROJECT_ID,
        );
        await taskRepository.storeItem(itemTrue);

        expect(await taskRepository.getItem(itemTrue.id)).toEqual(itemTrue);
        expect(await taskRepository.getItems(USER.id)).toEqual([itemTrue]);
    });

    test('updateItem updates name and completed', async () => {
         const itemA = new Task(
            '22222222-2222-2222-2222-222222222222',
            'A',
            'Desc A',
            'opened',
            CREATED_AT,
            USER.id,
            PROJECT_ID,
        );
        await taskRepository.storeItem(itemA);

                await taskRepository.updateItem(itemA.id, {
            name: 'B',
            description: 'Desc B',
            status: 'reopened',
        });

        expect(await taskRepository.getItem(itemA.id)).toEqual(
            new Task(
                itemA.id,
                'B',
                'Desc B',
                'reopened',
                CREATED_AT,
                USER.id,
                PROJECT_ID,
            ),
        );

        await expect(
            taskRepository.updateItem('missing-id', {
                name: 'newname',
                description: 'new desc',
                status: 'opened',
            }),
        ).resolves.toBeUndefined();
    });
});
