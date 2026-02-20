import { v4 as uuid } from 'uuid';
import { Todo } from '../../domain/entities/Todo.ts';
import type { TodoRepository } from '../../domain/repositories/TodoRepository.ts';

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
    constructor(private readonly todoRepository: TodoRepository) {}

    async createTodo(name: string, userId: string): Promise<Todo> {
        const todo = new Todo(uuid(), name, false, userId);
        await this.todoRepository.storeItem(todo);
        return todo;
    }

    async updateTodo(
        id: string,
        name: string,
        completed: boolean,
        userId: string,
    ): Promise<Todo | undefined> {
        const todo = await this.todoRepository.getItem(id, userId);
        if (!todo) {
            throw new Error('Todo not found');
        }

        if (todo.userId !== userId) {
            throw new Error('Unauthorized');
        }

        await this.todoRepository.updateItem(id, {
            name: name,
            completed: completed,
        });
        return this.todoRepository.getItem(id, userId);
    }

    async deleteTodo(id: string, userId: string): Promise<void> {
        const todo = await this.todoRepository.getItem(id, userId);
        if (!todo) {
            throw new Error('Todo not found');
        }
        if (todo.userId !== userId) {
            throw new Error('Unauthorized');
        }
        await this.todoRepository.removeItem(id);
    }

    async getAllTodos(userId: string): Promise<Todo[]> {
        return this.todoRepository.getItems(userId);
    }
}
