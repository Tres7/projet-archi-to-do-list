const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseBirthDate(value: unknown): Date | null {
    if (typeof value !== 'string' || !BIRTH_DATE_PATTERN.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}