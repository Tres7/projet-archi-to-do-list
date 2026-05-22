import { Task } from '../../../src/domain/entities/Task.ts';
import type { TaskRepository } from '../../../src/domain/repositories/TaskRepository.ts';
import { TaskName } from '../../../src/domain/value-objects/task-name.vo.ts';

export class FakeTaskRepository implements TaskRepository {
    readonly savedTasks: Task[] = [];
    readonly deletedTaskIds: string[] = [];

    private readonly tasks = new Map<string, Task>();

    constructor(tasks: Task[] = []) {
        for (const task of tasks) {
            this.tasks.set(task.id, this.copy(task));
        }
    }

    async findById(id: string): Promise<Task | null> {
        const task = this.tasks.get(id);
        return task ? this.copy(task) : null;
    }

    async findByProjectId(projectId: string): Promise<Task[]> {
        return [...this.tasks.values()]
            .filter((task) => task.projectId === projectId)
            .map((task) => this.copy(task));
    }

    async save(task: Task): Promise<void> {
        const storedTask = this.copy(task);
        this.savedTasks.push(storedTask);
        this.tasks.set(storedTask.id, storedTask);
    }

    async delete(taskId: string): Promise<void> {
        this.deletedTaskIds.push(taskId);
        this.tasks.delete(taskId);
    }

    private copy(task: Task): Task {
        const raw = task.toPrimitives();
        return new Task(
            raw.id,
            raw.userId,
            raw.projectId,
            raw.createdAt,
            TaskName.create(raw.name),
            raw.description,
            raw.status,
        );
    }
}
