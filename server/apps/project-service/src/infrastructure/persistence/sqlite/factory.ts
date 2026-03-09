import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { SqliteConnection } from './SqliteConnection.ts';
import { SqliteProjectRepository } from './SqliteProjectRepository.ts';

class SqliteDriverFactory implements DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer {
        const location = env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';
        const connection = new SqliteConnection(location);

        return {
            connection,
            repositories: {
                projectRepository: new SqliteProjectRepository(connection),
            },
        };
    }
}

export default new SqliteDriverFactory();
