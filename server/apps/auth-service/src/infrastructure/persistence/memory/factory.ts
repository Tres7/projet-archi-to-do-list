import type { DriverFactory } from '../DriverFactory.ts';
import type { PersistenceContainer } from '../types.ts';

import { InMemoryConnection } from './InMemoryConnection.ts';
import { InMemoryUserRepository } from './InMemoryUserRepository.ts';

class MemoryDriverFactory implements DriverFactory {
    create(): PersistenceContainer {
        const connection = new InMemoryConnection();

        return {
            connection,
            repositories: {
                userRepository: new InMemoryUserRepository(connection),
            },
        };
    }
}

export default new MemoryDriverFactory();
