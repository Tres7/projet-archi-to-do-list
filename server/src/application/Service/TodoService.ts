import { v4 as uuid } from 'uuid';
import { Todo } from "../../domain/entities/Todo.ts";
import type { TodoRepository } from '../../domain/repositories/TodoRepository.ts';


export class TodoService {
    constructor(private readonly repository: TodoRepository) {}

    async createTodo(name: string): Promise<Todo> {
        const todo = new Todo(uuid(), name, false);
        await this.repository.storeItem(todo);
        return todo;
    }

    async updateTodo(id: string, name: string, completed: boolean): Promise<Todo | undefined> {
        const todo = await this.repository.getItem(id);
        if (!todo) return undefined;

        todo.name = name;
        todo.completed = completed;

        await this.repository.updateItem(id, {
            name: todo.name,
            completed: todo.completed,
        });

        return todo;
    }

    async deleteTodo(id: string): Promise<void> {
        await this.repository.removeItem(id);
    }

    async getAllTodos(): Promise<Todo[]> {
        return this.repository.getItems();
    }

    async getTodoById(id: string): Promise<Todo | undefined> {
        return this.repository.getItem(id);
    }
}
