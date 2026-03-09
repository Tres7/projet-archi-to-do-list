import type { Task } from '../entities/Task.ts';

export interface TaskRepository {
    findById(id: string): Promise<Task | null>;
    findByProjectId(projectId: string): Promise<Task[]>;
    save(task: Task): Promise<void>;
    delete(taskId: string): Promise<void>;
}
