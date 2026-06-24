import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiRoot = path.resolve(currentDir, '../../../../../openapi');

interface OpenApiDocument {
    openapi: string;
    info: Record<string, unknown>;
    paths: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
}

function readYaml(relativePath: string): OpenApiDocument {
    const fullPath = path.join(openapiRoot, relativePath);
    const content = readFileSync(fullPath, 'utf8');
    return yaml.load(content) as OpenApiDocument;
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