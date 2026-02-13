import db from '../../persistence/index.ts';
import type { TodoItem } from '../../todoTypes.ts';
import { v4 as uuid } from 'uuid';
import { Todo } from "../../domain/entities/Todo.ts";


export class TodoService {
    async createTodo(name: string): Promise<TodoItem> {
        const todo = new Todo(uuid(), name, false);
        const item: TodoItem = {
            id: todo.id,
            name: todo.name,
            completed: todo.completed
        };
        await db.storeItem(item);
        return item;
    }

    async updateTodo(id: string, name: string, completed: boolean): Promise<TodoItem | undefined> {
        const todo = new Todo(id, name, completed);
            await db.updateItem(id, {
            name: todo.name,
            completed: todo.completed
      });
        return db.getItem(id);
    }

    async deleteTodo(id: string): Promise<void> {
        await db.removeItem(id);
    }

    async getAllTodos(): Promise<TodoItem[]> {
        return db.getItems();
    }
}
