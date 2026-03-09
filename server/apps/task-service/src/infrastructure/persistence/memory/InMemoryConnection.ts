import type { IDatabaseConnection } from '../IDatabaseConnection.ts';

export class InMemoryConnection implements IDatabaseConnection {
    private tables?: Map<string, Map<string, unknown>>;

    private requireTables(): Map<string, Map<string, unknown>> {
        if (!this.tables) {
            throw new Error('InMemory not initialized (call init() first)');
        }
        return this.tables;
    }

    async init(): Promise<void> {
        this.tables = new Map();
    }

    async teardown(): Promise<void> {
        this.tables = undefined;
    }

    table<T>(name: string): Map<string, T> {
        const tables = this.requireTables();
        let table = tables.get(name);
        if (!table) {
            table = new Map<string, unknown>();
            tables.set(name, table);
        }
        return table as Map<string, T>;
    }

    async clearDatabase(): Promise<void> {
        this.requireTables().clear();
    }
}
