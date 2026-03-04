import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { InMemoryConnection } from './InMemoryConnection.ts';
import { InMemoryProjectRepository } from './InMemoryProjectRepository.ts';
import { InMemoryTaskRepository } from './InMemoryTaskRepository.ts';
import { InMemoryUserRepository } from './InMemoryUserRepository.ts';

class MemoryDriverFactory implements DriverFactory {
    create(): PersistenceContainer {
        const connection = new InMemoryConnection();

        return {
            connection,
            repositories: {
                taskRepository: new InMemoryTaskRepository(connection),
                userRepository: new InMemoryUserRepository(connection),
                projectRepository: new InMemoryProjectRepository(connection)
            },
        };
    }
}

export default new MemoryDriverFactory();
