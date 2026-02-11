import db from '../../persistence/index.ts';
import type { TodoItem } from '../../todoTypes.ts';
import { v4 as uuid } from 'uuid';

export class TodoService {
    async createTodo(name: string) {
        const item: TodoItem = {
            id: uuid(),
            name: name,
            completed: false,
        };
        await db.storeItem(item);
        return item;
    }

    async updateTodo(id: string, name: string, completed: boolean) {
        await db.updateItem(id, {
            name: name,
            completed: completed,
        });
        const item = await db.getItem(id);
        return item;
    }

    async deleteTodo(id: string) {
        await db.removeItem(id);
    }

    async getAllTodos() {
        return db.getItems();
    }
}
