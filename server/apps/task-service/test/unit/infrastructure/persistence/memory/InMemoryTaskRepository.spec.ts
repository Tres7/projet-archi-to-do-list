import { beforeEach, describe, expect, test } from '@jest/globals';
import { Task } from '../../../../../src/domain/entities/Task.ts';
import { InMemoryConnection } from '../../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';
import { InMemoryTaskRepository } from '../../../../../src/infrastructure/persistence/memory/InMemoryTaskRepository.ts';

describe('InMemoryTaskRepository', () => {
    let repository: InMemoryTaskRepository;

    beforeEach(async () => {
        const connection = new InMemoryConnection();
        await connection.init();
        repository = new InMemoryTaskRepository(connection);
    });

    test('saves and finds tasks sorted by createdAt', async () => {
        const later = Task.create({
            id: 'task-2',
            userId: 'user-1',
            projectId: 'project-1',
            name: 'Later',
            createdAt: new Date('2024-01-02T10:00:00Z'),
        });
        const earlier = Task.create({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            name: 'Earlier',
            createdAt: new Date('2024-01-01T10:00:00Z'),
        });

        await repository.save(later);
        await repository.save(earlier);

        await expect(repository.findById('task-1')).resolves.toEqual(earlier);
        await expect(repository.findById('missing')).resolves.toBeNull();
        await expect(
            repository
                .findByProjectId('project-1')
                .then((tasks) => tasks.map((task) => task.id)),
        ).resolves.toEqual(['task-1', 'task-2']);
        await expect(
            repository.findByProjectId('other-project'),
        ).resolves.toEqual([]);
    });

    test('deletes tasks', async () => {
        await repository.save(
            Task.create({
                id: 'task-1',
                userId: 'user-1',
                projectId: 'project-1',
                name: 'Task',
            }),
        );

        await repository.delete('task-1');

        await expect(repository.findById('task-1')).resolves.toBeNull();
    });
});
