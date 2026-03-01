import type { Todo } from '../entities/Todo.ts';

export type TodoUpdate = Pick<Todo, 'name' | 'completed'>;

export interface TodoRepository {
    getItems(userId: string): Promise<Todo[]>;
    getItem(id: string): Promise<Todo | undefined>;
    storeItem(todo: Todo): Promise<void>;
    updateItem(id: string, todo: TodoUpdate): Promise<void>;
    removeItem(id: string): Promise<void>;
}
