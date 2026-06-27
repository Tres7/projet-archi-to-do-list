import { describe, expect, test } from '@jest/globals';
import { loadEnv } from '@app/common/env/loadEnv';

describe('loadEnv', () => {
    test('loads environment variables without throwing', () => {
        expect(() => loadEnv()).not.toThrow();
    });
});
