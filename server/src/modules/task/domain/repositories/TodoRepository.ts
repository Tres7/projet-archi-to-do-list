import type { Task } from '../entities/Task.ts';

export type TodoUpdate = Pick<Task, 'name' | 'completed'>;

export interface TodoRepository {
    getItems(userId: string): Promise<Task[]>;
    getItem(id: string): Promise<Task | undefined>;
    storeItem(task: Task): Promise<void>;
    updateItem(id: string, task: TodoUpdate): Promise<void>;
    removeItem(id: string): Promise<void>;
}
