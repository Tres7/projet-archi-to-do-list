import { PersistenceFactory } from './PersistenceFactory.ts';

const persistence = await PersistenceFactory.create();

export const connection = persistence.connection;
export const todoRepository = persistence.todoRepository;
export const userRepository = persistence.userRepository;
