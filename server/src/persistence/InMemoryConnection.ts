import type { IDatabaseConnection } from './IDatabaseConnection.ts';

export type TodoRow = {
    id: string;
    name: string;
    completed: boolean;
};

export class InMemoryConnection implements IDatabaseConnection {
    private todos?: Map<string, TodoRow>;

    private requireTodos(): Map<string, TodoRow> {
        if (!this.todos) {
            throw new Error('InMemory not initialized (call init() first)');
        }
        return this.todos;
    }

    async init(): Promise<void> {
        this.todos = new Map();
    }

    async teardown(): Promise<void> {
        this.todos = undefined;
    }

    todoTable(): Map<string, TodoRow> {
        return this.requireTodos();
    }

    clearTodos(): void {
        this.requireTodos().clear();
    }
}
