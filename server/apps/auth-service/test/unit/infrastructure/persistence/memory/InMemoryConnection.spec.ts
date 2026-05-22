import { describe, expect, test } from '@jest/globals';
import { InMemoryConnection } from '../../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';

describe('InMemoryConnection', () => {
    test('requires init before using tables', () => {
        const connection = new InMemoryConnection();

        expect(() => connection.table('users')).toThrow(
            'InMemory not initialized (call init() first)',
        );
    });

    test('creates, clears, and tears down tables', async () => {
        const connection = new InMemoryConnection();
        await connection.init();

        connection.table<{ id: string }>('users').set('1', { id: '1' });

        expect(connection.table('users').size).toBe(1);

        await connection.clearDatabase();
        expect(connection.table('users').size).toBe(0);

        await connection.teardown();
        expect(() => connection.table('users')).toThrow(
            'InMemory not initialized (call init() first)',
        );
    });
});
