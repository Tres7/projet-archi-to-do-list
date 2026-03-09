import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { InMemoryConnection } from './InMemoryConnection.ts';
import { InMemoryTaskRepository } from './InMemoryTaskRepository.ts';

class MemoryDriverFactory implements DriverFactory {
    create(): PersistenceContainer {
        const connection = new InMemoryConnection();

        return {
            connection,
            repositories: {
                taskRepository: new InMemoryTaskRepository(connection),
            },
        };
    }
}

export default new MemoryDriverFactory();
