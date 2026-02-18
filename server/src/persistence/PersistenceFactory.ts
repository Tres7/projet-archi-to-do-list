import type { TodoRepository } from '../domain/repositories/TodoRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

export type Persistence = {
    connection: IDatabaseConnection;
    todoRepository: TodoRepository;
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

            return { connection, todoRepository };
        }

        if (driver === 'sqlite') {
            const { SqliteConnection } =
                await import('./sqlite/SqliteConnection.ts');
            const { SqliteTodoRepository } =
                await import('./sqlite/SqliteTodoRepository.ts');

            const connection = new SqliteConnection();
            const todoRepository = new SqliteTodoRepository(connection);

            return { connection, todoRepository };
        }

        if (driver === 'memory') {
            const { InMemoryConnection } =
                await import('./memory/InMemoryConnection.ts');
            const { InMemoryTodoRepository } =
                await import('./memory/InMemoryTodoRepository.ts');

            const connection = new InMemoryConnection();
            const todoRepository = new InMemoryTodoRepository(connection);

            return { connection, todoRepository };
        }

        throw new Error(
            `Unsupported DB_DRIVER: ${driver}. Supported drivers are: mysql, sqlite or memory (default)`,
        );
    }
}
