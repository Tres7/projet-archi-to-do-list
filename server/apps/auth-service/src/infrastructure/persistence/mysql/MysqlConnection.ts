import type { IDatabaseConnection } from '../IDatabaseConnection.ts';
import {
    BaseMysqlConnection,
    type MysqlEnv,
} from '@app/common/persistence/mysql/BaseMysqlConnection';
import { migrations } from '../../../migrations/index.ts';

export class MysqlConnection
    extends BaseMysqlConnection
    implements IDatabaseConnection
{
    constructor(env: MysqlEnv) {
        super(env, migrations);
    }
}

export type { MysqlEnv };
