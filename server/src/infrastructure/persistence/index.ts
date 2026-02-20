import { PersistenceFactory } from './PersistenceFactory.ts';
import { parseDriver } from './types.ts';

const persistence = await PersistenceFactory.create(
    parseDriver(process.env.DB_DRIVER || 'memory'),
);

export default persistence;
export { persistence };
export type { PersistenceContainer, Repositories } from './types.ts';
