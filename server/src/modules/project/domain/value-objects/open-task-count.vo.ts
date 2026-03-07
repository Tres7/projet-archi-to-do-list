export class OpenTaskCount {
    private constructor(private readonly value: number) {}

    static create(value: number): OpenTaskCount {
        if (!Number.isInteger(value) || value < 0) {
            throw new Error('Open task count must be a non-negative integer');
        }

        return new OpenTaskCount(value);
    }

    getValue(): number {
        return this.value;
    }

    increment(): OpenTaskCount {
        return new OpenTaskCount(this.value + 1);
    }

    decrement(): OpenTaskCount {
        return new OpenTaskCount(Math.max(0, this.value - 1));
    }

    isZero(): boolean {
        return this.value === 0;
    }
}
