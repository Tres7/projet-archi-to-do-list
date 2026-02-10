import type { TodoItem } from '../todoTypes.js';

export type TodoUpdate = Pick<TodoItem, 'name' | 'completed'>;

export type TodoStore = {
    init(): Promise<void>;
    teardown(): Promise<void>;

    getItems(): Promise<TodoItem[]>;
    getItem(id: string): Promise<TodoItem | undefined>;
    storeItem(item: TodoItem): Promise<void>;
    updateItem(id: string, item: TodoUpdate): Promise<void>;
    removeItem(id: string): Promise<void>;
};
