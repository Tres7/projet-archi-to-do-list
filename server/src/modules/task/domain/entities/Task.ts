export type TaskStatus = 'opened' | 'closed' | 'reopened';

export class Task {
    constructor(
        public readonly id: string,
        public name: string,
        public description: string,
        public status: TaskStatus,
        public createdAt: Date,
        public userId: string,
        public projectId: string
    ) {}
}
