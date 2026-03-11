import {
    describe,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
} from '@jest/globals';

import fs from 'fs';

import type { IDatabaseConnection } from '../../../src/infrastructure/persistence/IDatabaseConnection.ts';
import { PersistenceFactory } from '../../../src/infrastructure/persistence/PersistenceFactory.ts';
import type { TaskRepository } from '../../../src/domain/repositories/TaskRepository.ts';
import { Task } from '../../../src/domain/entities/Task.ts';
import type { PersistenceDriver } from '../../../src/infrastructure/persistence/types.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';

const DRIVERS: PersistenceDriver[] = RUN_MYSQL
    ? ['memory', 'sqlite', 'mysql']
    : ['memory', 'sqlite'];

describe.each(DRIVERS)('TaskRepository contract (%s)', (driver) => {
    let connection: IDatabaseConnection;
    let taskRepository: TaskRepository;

    let sqlitePath: string | null = null;

    const PROJECT_ID = 'project-1';
    const USERID = 'userId-1';
    const taskParams = {
        id: 'task-1',
        userId: USERID,
        projectId: PROJECT_ID,
        name: 'Test Task',
        description: 'This is a test task',
    };

    beforeAll(async () => {
        const persistence = await PersistenceFactory.create(driver);
        connection = persistence.connection;
        taskRepository = persistence.repositories.taskRepository;
        await connection.init();
    });

    beforeEach(async () => {
        await connection.clearDatabase();
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

    it('it initializes correctly', async () => {
        const items = await taskRepository.findByProjectId(PROJECT_ID);
        expect(Array.isArray(items)).toBe(true);
    });

    it('it trhows when trying to use repository before initialization', async () => {
        const persistence = await PersistenceFactory.create(driver);
        const repo = persistence.repositories.taskRepository;

        await expect(repo.findByProjectId(PROJECT_ID)).rejects.toThrow();
    });

    it('it can store and retrieve items', async () => {
        const task = Task.create(taskParams);
        await taskRepository.save(task);

        const items = await taskRepository.findByProjectId(PROJECT_ID);
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(task);
    });

    it('it can find item by id', async () => {
        const nullItem = await taskRepository.findById('non-existent-id');
        expect(nullItem).toBeNull();

        const task = Task.create(taskParams);
        await taskRepository.save(task);

        const found = await taskRepository.findById(task.id);
        expect(found).toEqual(task);
    });

    it('it can find items by project id', async () => {
        const nullItems = await taskRepository.findByProjectId(
            'non-existent-project',
        );
        expect(Array.isArray(nullItems)).toBe(true);
        expect(nullItems.length).toBe(0);

        const task1 = Task.create({ ...taskParams, id: 'task-1' });
        const task2 = Task.create({ ...taskParams, id: 'task-2' });
        await taskRepository.save(task1);
        await taskRepository.save(task2);

        const items = await taskRepository.findByProjectId(PROJECT_ID);
        expect(items.length).toBe(2);
        expect(items).toEqual(expect.arrayContaining([task1, task2]));
    });

    it('it can delete items', async () => {
        const task = Task.create(taskParams);
        await taskRepository.save(task);

        await taskRepository.delete(task.id);
        const found = await taskRepository.findById(task.id);
        expect(found).toBeNull();
    });
});
