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
        const driver = (env.DB_DRIVER ?? 'sqlite').toLocaleLowerCase();

        if (driver && driver === 'mysql') {
            const { MysqlConnection } = await import('./MysqlConnection.ts');
            const { MysqlTodoRepository } =
                await import('./MysqlTodoRepository.ts');

            const connection = new MysqlConnection();
            const todoRepository = new MysqlTodoRepository(connection);

            return { connection, todoRepository };
        }

        if (driver && driver === 'sqlite') {
            const { SqliteConnection } = await import('./SqliteConnection.ts');
            const { SqliteTodoRepository } =
                await import('./SqliteTodoRepository.ts');

            const connection = new SqliteConnection();
            const todoRepository = new SqliteTodoRepository(connection);

            return { connection, todoRepository };
        }

        throw new Error(
            `Unsupported DB_DRIVER: ${driver}. Supported drivers are: mysql, sqlite (default)`,
        );
    }
}
