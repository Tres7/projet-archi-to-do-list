import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readOpenApiSpec } from '@app/common/openapi/readOpenApiSpec';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiRoot = path.resolve(currentDir, '../../../openapi');

export function loadOpenApiSpec() {
    return readOpenApiSpec(path.join(openapiRoot, 'v1/notifications.yml'));
}
