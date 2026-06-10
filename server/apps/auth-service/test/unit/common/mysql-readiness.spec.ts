import { describe, expect, jest, test } from '@jest/globals';

import { retryMysqlStartupQuery } from '@app/common/persistence/mysql/mysql-readiness';

function mysqlError(code: string, message = 'startup failed'): Error {
    return Object.assign(new Error(message), { code });
}

describe('retryMysqlStartupQuery', () => {
    test('returns the query result on first success', async () => {
        const query = jest.fn<() => Promise<string>>().mockResolvedValue('ok');

        await expect(retryMysqlStartupQuery(query)).resolves.toBe('ok');
        expect(query).toHaveBeenCalledTimes(1);
    });

    test('retries transient mysql startup errors', async () => {
        const delays: number[] = [];
        const query = jest
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(mysqlError('PROTOCOL_CONNECTION_LOST'))
            .mockRejectedValueOnce(
                new Error('Connection lost: The server closed the connection.'),
            )
            .mockResolvedValue('ready');

        await expect(
            retryMysqlStartupQuery(query, {
                attempts: 3,
                delayMs: 10,
                sleep: async (ms) => {
                    delays.push(ms);
                },
            }),
        ).resolves.toBe('ready');

        expect(query).toHaveBeenCalledTimes(3);
        expect(delays).toEqual([10, 20]);
    });

    test('does not retry non-transient errors', async () => {
        const query = jest
            .fn<() => Promise<string>>()
            .mockRejectedValue(new Error('syntax error'));

        await expect(
            retryMysqlStartupQuery(query, {
                attempts: 3,
                sleep: async () => {},
            }),
        ).rejects.toThrow('syntax error');

        expect(query).toHaveBeenCalledTimes(1);
    });

    test('throws after retry attempts are exhausted', async () => {
        const query = jest
            .fn<() => Promise<string>>()
            .mockRejectedValue(mysqlError('ECONNRESET'));

        await expect(
            retryMysqlStartupQuery(query, {
                attempts: 2,
                delayMs: 5,
                sleep: async () => {},
            }),
        ).rejects.toThrow('startup failed');

        expect(query).toHaveBeenCalledTimes(2);
    });
});
