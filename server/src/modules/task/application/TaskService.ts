import { v4 as uuid } from 'uuid';
import { Task } from '../domain/entities/Task.ts';
import { UnauthorizedError } from '../../../common/errors/UnauthorizedError.ts';
import { NotFoundError } from '../../../common/errors/NotFoundError.ts';
import type { TaskRepository } from '../domain/repositories/TaskRepository.ts';
import type { EventPublisher } from '../../../infrastructure/messaging/bullmq/bullmq.types.ts';

export interface ITaskService {
    createTodo(name: string, userId: string): Promise<Task>;
    updateTodo(
        id: string,
        name: string,
        completed: boolean,
        userId: string,
    ): Promise<Task | undefined>;
    deleteTodo(id: string, userId: string): Promise<void>;
    getAllTodos(userId: string): Promise<Task[]>;
}

export class TaskService implements ITaskService {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly events: EventPublisher,
    ) {}

    async createTodo(name: string, userId: string): Promise<Task> {
        const todo = new Task(uuid(), name, false, userId);
        await this.taskRepository.storeItem(todo);

        await this.events.publish('task.created', {
            taskId: todo.id,
            name: todo.name,
            userId: todo.userId,
            userEmail: 'test@example.com',
        });

        return todo;
    }

    async updateTodo(
        id: string,
        name: string,
        completed: boolean,
        userId: string,
    ): Promise<Task | undefined> {
        const todo = await this.taskRepository.getItem(id);
        if (!todo) {
            throw new NotFoundError();
        }

        if (todo.userId !== userId) {
            throw new UnauthorizedError();
        }

        await this.taskRepository.updateItem(id, {
            name: name,
            completed: completed,
        });

        if (todo.completed && !completed) {
            await this.events.publish('task.reopened', {
                taskId: id,
                userId,
                userEmail: 'test@example.com',
            });
        }

        if (!todo.completed && completed) {
            await this.events.publish('task.closed', {
                taskId: id,
                userId,
                userEmail: 'test@example.com',
            });
        }

        return this.taskRepository.getItem(id);
    }

    async deleteTodo(id: string, userId: string): Promise<void> {
        const todo = await this.taskRepository.getItem(id);
        if (!todo) {
            throw new NotFoundError();
        }
        if (todo.userId !== userId) {
            throw new UnauthorizedError();
        }
        await this.taskRepository.removeItem(id);

        await this.events.publish('task.deleted', {
            taskId: id,
            userId: userId,
            userEmail: 'test@example.com',
        });
    }

    async getAllTodos(userId: string): Promise<Task[]> {
        return this.taskRepository.getItems(userId);
    }
}
