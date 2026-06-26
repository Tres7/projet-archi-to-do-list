import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiRoot = path.resolve(currentDir, '../../../../openapi');

interface OpenApiDocument {
    openapi: string;
    info: Record<string, unknown>;
    paths: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
}

export function loadOpenApiSpec(): OpenApiDocument {
    const fullPath = path.join(openapiRoot, 'v1/projects.yml');
    const content = readFileSync(fullPath, 'utf8');
    return yaml.load(content) as OpenApiDocument;
}
