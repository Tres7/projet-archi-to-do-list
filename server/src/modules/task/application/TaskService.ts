import { v4 as uuid } from 'uuid';
import { Task, type TaskStatus } from '../domain/entities/Task.ts';
import { UnauthorizedError } from '../../../common/errors/UnauthorizedError.ts';
import { NotFoundError } from '../../../common/errors/NotFoundError.ts';
import type { TaskRepository, TaskUpdate } from '../domain/repositories/TaskRepository.ts';
import type { EventPublisher } from '../../../infrastructure/messaging/bullmq/bullmq.types.ts';

export interface ITaskService {
    createTask(name: string, description: string, userId: string, projectId: string,): Promise<Task>;
    updateTask(
        taskid: string,
        userId: string,
        name?: string,
        description?: string,
        status?: TaskStatus
    ): Promise<Task | undefined>;
    deleteTask(id: string, userId: string): Promise<void>;
    getAllTasks(userId: string): Promise<Task[]>;
}

export class TaskService implements ITaskService {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly events: EventPublisher,
    ) {}

    async createTask(name: string, description: string, userId: string, projectId: string, ): Promise<Task> {
        const task = new Task(uuid(), name,  description ,'opened', new Date(), userId, projectId);
        await this.taskRepository.storeItem(task);

        await this.events.publish('task.created', {
            taskId: task.id,
            name: task.name,
            userId: task.userId,
            userEmail: 'test@example.com',
        });

        return task;
    }

    async updateTask(
        id: string,
        userId: string,
        name?: string,
        description?: string,
        status?: TaskStatus
        
    ): Promise<Task | undefined> {
        const task = await this.taskRepository.getItem(id);
        if (!task) {
            throw new NotFoundError();
        }

        if (task.userId !== userId) {
            throw new UnauthorizedError();
        }

        await this.taskRepository.updateItem(id, {
            name,
            description,
            status
        });

        if (task.status == 'reopened') {
            await this.events.publish('task.reopened', {
                taskId: id,
                userId,
                userEmail: 'test@example.com',
            });
        }

        if (task.status == 'closed') {
            await this.events.publish('task.closed', {
                taskId: id,
                userId,
                userEmail: 'test@example.com',
            });
        }

        return this.taskRepository.getItem(id);
    }

    async deleteTask(id: string, userId: string): Promise<void> {
        const task = await this.taskRepository.getItem(id);
        if (!task) {
            throw new NotFoundError();
        }
        if (task.userId !== userId) {
            throw new UnauthorizedError();
        }
        await this.taskRepository.removeItem(id);

        await this.events.publish('task.deleted', {
            taskId: id,
            userId: userId,
            userEmail: 'test@example.com',
        });
    }

    async getAllTasks(userId: string): Promise<Task[]> {
        return this.taskRepository.getItems(userId);
    }
}
