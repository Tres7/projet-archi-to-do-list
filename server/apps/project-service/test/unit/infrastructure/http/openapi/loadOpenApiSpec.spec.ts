import { describe, expect, test } from '@jest/globals';
import { loadOpenApiSpec } from '../../../../../src/infrastructure/http/openapi/loadOpenApiSpec.ts';

describe('loadOpenApiSpec', () => {
    test('loads the v1 projects spec', () => {
        const spec = loadOpenApiSpec();

        expect(spec.openapi).toBe('3.0.3');
        expect(spec.paths).toHaveProperty('/v1/projects');
        expect(spec.paths).toHaveProperty(['/v1/projects/{projectId}/tasks', 'post']);
        expect(spec.components?.schemas).toHaveProperty('Project');
    });
});
