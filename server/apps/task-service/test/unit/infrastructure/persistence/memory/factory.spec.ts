import { describe, expect, test } from '@jest/globals';
import memoryFactory from '../../../../../src/infrastructure/persistence/memory/factory.ts';
import { InMemoryConnection } from '../../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';
import { InMemoryTaskRepository } from '../../../../../src/infrastructure/persistence/memory/InMemoryTaskRepository.ts';

describe('memory factory', () => {
    test('creates memory container', () => {
        const container = memoryFactory.create();

        expect(container.connection).toBeInstanceOf(InMemoryConnection);
        expect(container.repositories.taskRepository).toBeInstanceOf(
            InMemoryTaskRepository,
        );
    });
});
