import { describe, expect, test } from '@jest/globals';
import { User } from '../../../src/domain/entities/User.ts';

describe('User', () => {
    test('stores user fields', () => {
        expect(
            new User('1', 'Alice', 'alice@example.com', 'password-hash', null),
        ).toEqual({
            id: '1',
            userName: 'Alice',
            email: 'alice@example.com',
            passwordHash: 'password-hash',
            birthDate: null
        });
    });
});
