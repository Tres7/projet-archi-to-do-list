import type { UserRepository } from '../../modules/auth/domain/repositories/UserRepository.ts';
import type { ProjectRepository } from '../../modules/project/domain/repositories/ProjectRepository.ts';
import type { TodoRepository } from '../../modules/task/domain/repositories/TodoRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

export type PersistenceDriver = 'mysql' | 'sqlite' | 'memory';

export type Repositories = {
    todoRepository: TodoRepository;
    userRepository: UserRepository;
    projectRepository: ProjectRepository;
};

export type PersistenceContainer = {
    connection: IDatabaseConnection;
    repositories: Repositories;
};

export function parseDriver(v: unknown): PersistenceDriver {
    const s = String(v ?? 'memory').toLowerCase();
    if (s === 'mysql' || s === 'sqlite' || s === 'memory') return s;
    throw new Error(`Unsupported DB_DRIVER: ${v}`);
}
