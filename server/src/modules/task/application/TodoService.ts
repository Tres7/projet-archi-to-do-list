import { v4 as uuid } from 'uuid';
import { Todo } from '../domain/entities/Todo.ts';
import { UnauthorizedError } from '../../../common/errors/UnauthorizedError.ts';
import { NotFoundError } from '../../../common/errors/NotFoundError.ts';
import type { TodoRepository } from '../domain/repositories/TodoRepository.ts';
import type { EventPublisher } from '../../../infrastructure/messaging/bullmq/bullmq.types.ts';

export interface ITodoService {
    createTodo(name: string, userId: string): Promise<Todo>;
    updateTodo(
        id: string,
        name: string,
        completed: boolean,
        userId: string,
    ): Promise<Todo | undefined>;
    deleteTodo(id: string, userId: string): Promise<void>;
    getAllTodos(userId: string): Promise<Todo[]>;
}

export class TodoService implements ITodoService {
    constructor(
        private readonly todoRepository: TodoRepository,
        private readonly events: EventPublisher,
    ) {}

    async createTodo(name: string, userId: string): Promise<Todo> {
        const todo = new Todo(uuid(), name, false, userId);
        await this.todoRepository.storeItem(todo);

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
    ): Promise<Todo | undefined> {
        const todo = await this.todoRepository.getItem(id);
        if (!todo) {
            throw new NotFoundError();
        }

        if (todo.userId !== userId) {
            throw new UnauthorizedError();
        }

        await this.todoRepository.updateItem(id, {
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

        return this.todoRepository.getItem(id);
    }

    async deleteTodo(id: string, userId: string): Promise<void> {
        const todo = await this.todoRepository.getItem(id);
        if (!todo) {
            throw new NotFoundError();
        }
        if (todo.userId !== userId) {
            throw new UnauthorizedError();
        }
        await this.todoRepository.removeItem(id);

        await this.events.publish('task.deleted', {
            taskId: id,
            userId: userId,
            userEmail: 'test@example.com',
        });
    }

    async getAllTodos(userId: string): Promise<Todo[]> {
        return this.todoRepository.getItems(userId);
    }
}
