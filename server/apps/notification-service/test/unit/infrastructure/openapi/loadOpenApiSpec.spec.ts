import { describe, expect, test } from '@jest/globals';
import { loadOpenApiSpec } from '../../../../src/infrastructure/openapi/loadOpenApiSpec.ts';

describe('loadOpenApiSpec', () => {
    test('loads the v1 notifications spec', () => {
        const spec = loadOpenApiSpec();

        expect(spec.openapi).toBe('3.0.3');
        expect(spec.paths).toHaveProperty('/v1/notifications/events');
    });
});
