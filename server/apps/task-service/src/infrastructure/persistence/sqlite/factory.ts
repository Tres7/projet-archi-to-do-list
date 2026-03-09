import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { SqliteConnection } from './SqliteConnection.ts';
import { SqliteTaskRepository } from './SqliteTaskRepository.ts';

class SqliteDriverFactory implements DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer {
        const location = env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';
        const connection = new SqliteConnection(location);

        return {
            connection,
            repositories: {
                taskRepository: new SqliteTaskRepository(connection),
            },
        };
    }
}

export default new SqliteDriverFactory();
