import type { PersistenceContainer } from './types.ts';

export interface DriverFactory {
    create(env: NodeJS.ProcessEnv): PersistenceContainer;
}
