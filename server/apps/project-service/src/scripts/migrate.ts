import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runMigrateCli } from '@app/common/persistence/migrations/runMigrateCli';
import { migrations } from '../migrations/index.ts';

await runMigrateCli(
    migrations,
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env'),
);
