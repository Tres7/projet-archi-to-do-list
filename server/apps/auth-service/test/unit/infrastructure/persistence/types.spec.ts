import { describe, expect, test } from '@jest/globals';
import { parseDriver } from '../../../../src/infrastructure/persistence/types.ts';

describe('parseDriver', () => {
    test('parses supported drivers and defaults to memory', () => {
        expect(parseDriver(undefined)).toBe('memory');
        expect(parseDriver('memory')).toBe('memory');
        expect(parseDriver('MYSQL')).toBe('mysql');
        expect(parseDriver('Sqlite')).toBe('sqlite');
    });

    test('rejects unsupported drivers', () => {
        expect(() => parseDriver('postgres')).toThrow(
            'Unsupported DB_DRIVER: postgres',
        );
    });
});
