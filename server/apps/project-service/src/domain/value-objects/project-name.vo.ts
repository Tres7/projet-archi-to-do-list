export class ProjectName {
    private constructor(private readonly value: string) {}

    static create(value: string): ProjectName {
        const normalized = value.trim();

        if (!normalized) {
            throw new Error('Project name is required');
        }

        if (normalized.length > 120) {
            throw new Error('Project name must be between 2 and 120 characters');
        }

        return new ProjectName(normalized);
    }

    getValue(): string {
        return this.value;
    }
}
