import type { TodoRepository } from '../domain/repositories/TodoRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

const mod = process.env.MYSQL_HOST
    ? await import('./mysql.js')
    : await import('./sqlite.js');

const connection: IDatabaseConnection = mod.connection;
const todoRepository: TodoRepository = mod.todoRepository;
export { connection, todoRepository };
