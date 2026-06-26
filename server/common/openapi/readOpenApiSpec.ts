import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

export interface OpenApiDocument {
    openapi: string;
    info: Record<string, unknown>;
    paths: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
}

export function readOpenApiSpec(fullPath: string): OpenApiDocument {
    const content = readFileSync(fullPath, 'utf8');
    return yaml.load(content) as OpenApiDocument;
}
