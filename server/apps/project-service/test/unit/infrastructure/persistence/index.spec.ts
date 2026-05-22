import { describe, expect, jest, test } from '@jest/globals';

const createMock = jest.fn<(driver: string) => Promise<object>>();

jest.unstable_mockModule(
    '../../../../src/infrastructure/persistence/PersistenceFactory.ts',
    () => ({
        PersistenceFactory: {
            create: createMock,
        },
    }),
);

describe('persistence index', () => {
    test('creates persistence from DB_DRIVER env', async () => {
        const originalDriver = process.env.DB_DRIVER;
        process.env.DB_DRIVER = 'sqlite';
        createMock.mockResolvedValue({ connection: {}, repositories: {} });

        const { persistence } =
            await import('../../../../src/infrastructure/persistence/index.ts');

        expect(createMock).toHaveBeenCalledWith('sqlite');
        expect(persistence).toEqual({ connection: {}, repositories: {} });

        if (originalDriver === undefined) {
            delete process.env.DB_DRIVER;
        } else {
            process.env.DB_DRIVER = originalDriver;
        }
    });
});
