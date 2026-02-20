import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';
import type { MysqlEnv } from './config.ts';

import { MysqlConnection } from './MysqlConnection.ts';
import { MysqlTodoRepository } from './MysqlTodoRepository.ts';
import { MysqlUserRepository } from './MysqlUserRepository.ts';



class MysqlDriverFactory implements DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer {
        const mysqlEnv: MysqlEnv = {
            MYSQL_HOST: env.MYSQL_HOST,
            MYSQL_HOST_FILE: env.MYSQL_HOST_FILE,
            MYSQL_USER: env.MYSQL_USER,
            MYSQL_USER_FILE: env.MYSQL_USER_FILE,
            MYSQL_PASSWORD: env.MYSQL_PASSWORD,
            MYSQL_PASSWORD_FILE: env.MYSQL_PASSWORD_FILE,
            MYSQL_DB: env.MYSQL_DB,
            MYSQL_DB_FILE: env.MYSQL_DB_FILE,
        };

        const connection = new MysqlConnection(mysqlEnv);

        return {
            connection,
            repositories: {
                todoRepository: new MysqlTodoRepository(connection),
                userRepository: new MysqlUserRepository(connection),
            },
        };
    }
}

export default new MysqlDriverFactory();
