import type { Task } from '../entities/Task.ts';

export type TaskUpdate = Partial<
    Pick<Task, 'name' | 'description' | 'status'>
>;

export interface TaskRepository {
    getItems(userId: string): Promise<Task[]>;
    getItem(id: string): Promise<Task | undefined>;
    storeItem(task: Task): Promise<void>;
    updateItem(id: string, task: TaskUpdate): Promise<void>;
    removeItem(id: string): Promise<void>;
}
