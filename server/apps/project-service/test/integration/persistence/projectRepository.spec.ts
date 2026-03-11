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
import type { ProjectRepository } from '../../../src/domain/repositories/ProjectRepository.ts';
import { Project } from '../../../src/domain/entities/Project.ts';
import type { PersistenceDriver } from '../../../src/infrastructure/persistence/types.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';

const DRIVERS: PersistenceDriver[] = RUN_MYSQL
    ? ['memory', 'sqlite', 'mysql']
    : ['memory', 'sqlite'];

describe.each(DRIVERS)('ProjectRepository contract (%s)', (driver) => {
    let connection: IDatabaseConnection;
    let projectRepository: ProjectRepository;

    let sqlitePath: string | null = null;

    const PROJECT_ID = 'project-1';
    const USERID = 'userId-1';
    const projectParams = {
        id: 'project-1',
        ownerId: USERID,
        name: 'Test Project',
        description: 'This is a test project',
    };

    beforeAll(async () => {
        const persistence = await PersistenceFactory.create(driver);
        connection = persistence.connection;
        projectRepository = persistence.repositories.projectRepository;
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
        const items = await projectRepository.findByOwnerId(USERID);
        expect(Array.isArray(items)).toBe(true);
    });

    it('it trhows when trying to use repository before initialization', async () => {
        const persistence = await PersistenceFactory.create(driver);
        const repo = persistence.repositories.projectRepository;

        await expect(repo.findByOwnerId(USERID)).rejects.toThrow();
    });

    it('it can store and retrieve items', async () => {
        const project = Project.create(projectParams);
        await projectRepository.save(project);

        const items = await projectRepository.findByOwnerId(USERID);
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(project);
    });

    it('it can find item by id', async () => {
        const nullItem = await projectRepository.findById('non-existent-id');
        expect(nullItem).toBeNull();

        const project = Project.create(projectParams);
        await projectRepository.save(project);

        const found = await projectRepository.findById(project.id);
        expect(found).toEqual(project);
    });

    it('it can find items by owner id', async () => {
        const nullItems = await projectRepository.findByOwnerId(
            'non-existent-owner-id',
        );
        expect(Array.isArray(nullItems)).toBe(true);
        expect(nullItems.length).toBe(0);

        const project1 = Project.create({ ...projectParams, id: 'project-1' });
        const project2 = Project.create({ ...projectParams, id: 'project-2' });
        await projectRepository.save(project1);
        await projectRepository.save(project2);

        const items = await projectRepository.findByOwnerId(USERID);
        expect(items.length).toBe(2);
        expect(items).toEqual(expect.arrayContaining([project1, project2]));
    });

    it('it can delete items', async () => {
        const project = Project.create(projectParams);
        await projectRepository.save(project);

        await projectRepository.delete(project.id);
        const found = await projectRepository.findById(project.id);
        expect(found).toBeNull();
    });
});
