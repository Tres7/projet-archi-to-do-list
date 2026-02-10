// server/src/domain/entities/Todo.ts
import { v4 as uuid } from 'uuid';

/**
 * Todo entity - Represents a task in the domain
 * 
 * Business rules:
 * - A todo must have a non-empty name
 * - A todo has a unique identifier
 * - A todo can be completed or not completed
 */
export class Todo {
    readonly id: string;
    private _name: string;
    private _completed: boolean;

    constructor(name: string, id?: string, completed: boolean = false) {
        if (!name || name.trim() === '') {
            throw new Error('Todo name cannot be empty');
        }
        this.id = id || uuid();
        this._name = name.trim();
        this._completed = completed;
    }

    get name(): string {
        return this._name;
    }

    get completed(): boolean {
        return this._completed;
    }

    complete(): void {
        this._completed = true;
    }

    uncomplete(): void {
        this._completed = false;
    }

    rename(newName: string): void {
        if (!newName || newName.trim() === '') {
            throw new Error('Todo name cannot be empty');
        }
        this._name = newName.trim();
    }

    /**
     * Updates the todo with partial data
     * @param updates - Object containing name and/or completed status
     */
    update(updates: { name?: string; completed?: boolean }): void {
        if (updates.name !== undefined) {
            this.rename(updates.name);
        }
        if (updates.completed !== undefined) {
            updates.completed ? this.complete() : this.uncomplete();
        }
    }

    /**
     * Converts the entity to a plain JavaScript object
     * Useful for serialization (API responses, database storage)
     */
    toJSON(): { id: string; name: string; completed: boolean } {
        return {
            id: this.id,
            name: this._name,
            completed: this._completed,
        };
    }

    /**
     * Static factory method to reconstruct a Todo from persistence data
     * @param data - Data from database or external source
     * @returns A new Todo instance
     */
    static fromPersistence(data: { id: string; name: string; completed: boolean }): Todo {
        return new Todo(data.name, data.id, data.completed);
    }
}