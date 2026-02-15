import db from '../../persistence/index.ts';
import { v4 as uuid } from 'uuid';
import { Todo } from "../../domain/entities/Todo.ts";


export class TodoService {
    async createTodo(name: string): Promise<Todo> {
        const todo = new Todo(uuid(), name, false);
        await db.storeItem(todo);
        return todo;
    }

    async updateTodo(id: string, name: string, completed: boolean): Promise<Todo | undefined> {
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

    async getAllTodos(): Promise<Todo[]> {
        return db.getItems();
    }
}
