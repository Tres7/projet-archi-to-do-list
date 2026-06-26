import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readOpenApiSpec, type OpenApiDocument } from '@app/common/openapi/readOpenApiSpec';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiRoot = path.resolve(currentDir, '../../../../../openapi');

function readYaml(relativePath: string): OpenApiDocument {
    return readOpenApiSpec(path.join(openapiRoot, relativePath));
}

export type OpenApiVersion = 'v1' | 'v2';

export function loadOpenApiSpec(version: OpenApiVersion): OpenApiDocument {
    const auth = readYaml(`${version}/auth.yml`);
    const users = readYaml(`${version}/users.yml`);

    return {
        openapi: auth.openapi,
        info: {
            title: 'Auth Service API',
            version: auth.info.version,
        },
        paths: {
            ...auth.paths,
            ...users.paths,
        },
        components: {
            schemas: {
                ...(auth.components?.schemas ?? {}),
                ...(users.components?.schemas ?? {}),
            },
        },
    };
}