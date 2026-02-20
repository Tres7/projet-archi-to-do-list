import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { SqliteConnection } from './SqliteConnection.ts';
import { SqliteTodoRepository } from './SqliteTodoRepository.ts';
import { SqliteUserRepository } from './SqliteUserRepository.ts';

class SqliteDriverFactory implements DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer {
        const location = env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';
        const connection = new SqliteConnection(location);

        return {
            connection,
            repositories: {
                todoRepository: new SqliteTodoRepository(connection),
                userRepository: new SqliteUserRepository(connection),
            },
        };
    }
}

export default new SqliteDriverFactory();
