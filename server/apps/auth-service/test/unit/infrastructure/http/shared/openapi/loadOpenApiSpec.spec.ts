import { describe, expect, test } from '@jest/globals';
import { loadOpenApiSpec } from '../../../../../../src/infrastructure/http/shared/openapi/loadOpenApiSpec.ts';

describe('loadOpenApiSpec', () => {
    test('v1 merges auth and users paths without birthDate', () => {
        const spec = loadOpenApiSpec('v1');

        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info).toEqual({ title: 'Auth Service API', version: '1.0.0' });

        expect(spec.paths).toHaveProperty('/v1/auth/login');
        expect(spec.paths).toHaveProperty('/v1/auth/register');
        expect(spec.paths).toHaveProperty('/v1/users');
        expect(spec.paths).toHaveProperty('/v1/users/{id}');

        expect(spec.components?.schemas).toHaveProperty('UserV1');
        expect(spec.components?.schemas).not.toHaveProperty([
            'UserV1',
            'properties',
            'birthDate',
        ]);
    });

    test('v2 merges auth and users paths with birthDate', () => {
        const spec = loadOpenApiSpec('v2');

        expect(spec.info).toEqual({ title: 'Auth Service API', version: '2.0.0' });

        expect(spec.paths).toHaveProperty('/v2/auth/login');
        expect(spec.paths).toHaveProperty('/v2/auth/register');
        expect(spec.paths).toHaveProperty('/v2/users');
        expect(spec.paths).toHaveProperty('/v2/users/{id}');

        expect(spec.components?.schemas).toHaveProperty([
            'UserV2',
            'properties',
            'birthDate',
        ]);
        expect(spec.paths).toHaveProperty([
            '/v2/auth/register',
            'post',
            'requestBody',
            'required',
        ]);
    });
});