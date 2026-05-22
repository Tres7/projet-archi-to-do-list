import { describe, expect, test } from '@jest/globals';
import { PersistenceFactory } from '../../../../src/infrastructure/persistence/PersistenceFactory.ts';
import { InMemoryConnection } from '../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';
import { InMemoryProjectRepository } from '../../../../src/infrastructure/persistence/memory/InMemoryProjectRepository.ts';

describe('PersistenceFactory', () => {
    test('creates memory persistence', async () => {
        const container = await PersistenceFactory.create('memory');

        expect(container.connection).toBeInstanceOf(InMemoryConnection);
        expect(container.repositories.projectRepository).toBeInstanceOf(
            InMemoryProjectRepository,
        );
    });

    test('throws clear error for missing drivers', async () => {
        await expect(
            PersistenceFactory.create('unknown' as never),
        ).rejects.toThrow(
            'Cannot load persistence driver "unknown". Expected module "./unknown/factory.ts".',
        );
    });
});
