import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { SqliteConnection } from './SqliteConnection.ts';
import { SqliteProjectRepository } from './SqliteProjectRepository.ts';
import { SqliteTaskRepository } from './SqliteTaskRepository.ts';
import { SqliteUserRepository } from './SqliteUserRepository.ts';

class SqliteDriverFactory implements DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer {
        const location = env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';
        const connection = new SqliteConnection(location);

        return {
            connection,
            repositories: {
                taskRepository: new SqliteTaskRepository(connection),
                userRepository: new SqliteUserRepository(connection),
                projectRepository: new SqliteProjectRepository(connection)
            },
        };
    }
}

export default new SqliteDriverFactory();
