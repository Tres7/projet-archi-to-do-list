import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

export type PersistenceDriver = 'mysql' | 'sqlite' | 'memory';

export type Repositories = {
    userRepository: UserRepository;
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
