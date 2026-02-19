import type { TodoRepository } from '../../domain/repositories/TodoRepository.ts';
import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';
import { InMemoryUserRepository } from './memory/InMemoryUserRepository.ts';
import { MysqlUserRepository } from './mysql/MysqlUserRepository.ts';
import { SqliteUserRepository } from './sqlite/SqliteUserRepository.ts';

export type Persistence = {
    connection: IDatabaseConnection;
    todoRepository: TodoRepository;
    userRepository: UserRepository;
};

export class PersistenceFactory {
    static async create(
        env: NodeJS.ProcessEnv = process.env,
    ): Promise<Persistence> {
        const driver = (env.DB_DRIVER ?? 'memory').toLocaleLowerCase();

        if (driver === 'mysql') {
            const { MysqlConnection } =
                await import('./mysql/MysqlConnection.ts');
            const { MysqlTodoRepository } =
                await import('./mysql/MysqlTodoRepository.ts');

            const connection = new MysqlConnection();
            const todoRepository = new MysqlTodoRepository(connection);
            const userRepository = new MysqlUserRepository(connection);

            return { connection, todoRepository, userRepository };
        }

        if (driver === 'sqlite') {
            const { SqliteConnection } =
                await import('./sqlite/SqliteConnection.ts');
            const { SqliteTodoRepository } =
                await import('./sqlite/SqliteTodoRepository.ts');

            const connection = new SqliteConnection();
            const todoRepository = new SqliteTodoRepository(connection);
            const userRepository = new SqliteUserRepository(connection);
            return { connection, todoRepository, userRepository };
        }

        if (driver === 'memory') {
            const { InMemoryConnection } =
                await import('./memory/InMemoryConnection.ts');
            const { InMemoryTodoRepository } =
                await import('./memory/InMemoryTodoRepository.ts');

            const connection = new InMemoryConnection();
            const todoRepository = new InMemoryTodoRepository(connection);
            const userRepository = new InMemoryUserRepository(connection);

            return { connection, todoRepository, userRepository };
        }

        throw new Error(
            `Unsupported DB_DRIVER: ${driver}. Supported drivers are: mysql, sqlite or memory (default)`,
        );
    }
}
