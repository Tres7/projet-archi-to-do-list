export class TaskName {
    private constructor(private readonly value: string) {}

    static create(value: string): TaskName {
        const normalized = value.trim();

        if (!normalized) {
            throw new Error('Task name is required');
        }

        if (normalized.length > 120) {
            throw new Error('Task name is too long');
        }

        return new TaskName(normalized);
    }

    getValue(): string {
        return this.value;
    }

    equals(other: TaskName): boolean {
        return this.value === other.value;
    }
}
