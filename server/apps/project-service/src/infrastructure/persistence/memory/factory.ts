import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { InMemoryConnection } from './InMemoryConnection.ts';
import { InMemoryProjectRepository } from './InMemoryProjectRepository.ts';

class MemoryDriverFactory implements DriverFactory {
    create(): PersistenceContainer {
        const connection = new InMemoryConnection();

        return {
            connection,
            repositories: {
                projectRepository: new InMemoryProjectRepository(connection),
            },
        };
    }
}

export default new MemoryDriverFactory();
