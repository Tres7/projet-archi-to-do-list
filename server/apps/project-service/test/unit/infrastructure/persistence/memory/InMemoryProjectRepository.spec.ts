import { beforeEach, describe, expect, test } from '@jest/globals';
import { Project } from '../../../../../src/domain/entities/Project.ts';
import { InMemoryConnection } from '../../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';
import { InMemoryProjectRepository } from '../../../../../src/infrastructure/persistence/memory/InMemoryProjectRepository.ts';

describe('InMemoryProjectRepository', () => {
    let repository: InMemoryProjectRepository;

    beforeEach(async () => {
        const connection = new InMemoryConnection();
        await connection.init();
        repository = new InMemoryProjectRepository(connection);
    });

    test('saves and finds projects', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Project',
            description: 'Description',
        });

        await repository.save(project);

        await expect(repository.findById('project-1')).resolves.toEqual(
            project,
        );
        await expect(repository.findByOwnerId('user-1')).resolves.toEqual([
            project,
        ]);
        await expect(repository.findByOwnerId('other-user')).resolves.toEqual(
            [],
        );
        await expect(repository.findById('missing')).resolves.toBeNull();
    });

    test('deletes projects', async () => {
        await repository.save(
            Project.create({
                id: 'project-1',
                ownerId: 'user-1',
                name: 'Project',
            }),
        );

        await repository.delete('project-1');

        await expect(repository.findById('project-1')).resolves.toBeNull();
    });
});
