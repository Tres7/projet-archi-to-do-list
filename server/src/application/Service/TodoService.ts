import { v4 as uuid } from 'uuid';
import { Todo } from '../../domain/entities/Todo.ts';
import type { TodoRepository } from '../../domain/repositories/TodoRepository.ts';

export class TodoService {
    constructor(private readonly todoRepository: TodoRepository) {}
    async createTodo(name: string): Promise<Todo> {
        const todo = new Todo(uuid(), name, false);
        await this.todoRepository.storeItem(todo);
        return todo;
    }

    async updateTodo(
        id: string,
        name: string,
        completed: boolean,
    ): Promise<Todo | undefined> {
        const todo = new Todo(id, name, completed);
        await this.todoRepository.updateItem(id, {
            name: todo.name,
            completed: todo.completed,
        });
        return this.todoRepository.getItem(id);
    }

    async deleteTodo(id: string): Promise<void> {
        await this.todoRepository.removeItem(id);
    }

    async getAllTodos(): Promise<Todo[]> {
        return this.todoRepository.getItems();
    }
}
