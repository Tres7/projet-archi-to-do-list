import { TaskName } from '../value-objects/task-name.vo.ts';
import {
    TaskStatusValues,
    type TaskStatus,
    toggleTaskStatus,
} from '../value-objects/task-status.vo.ts';

export class Task {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly projectId: string,
        public readonly createdAt: Date,
        private name: TaskName,
        private description: string,
        private status: TaskStatus,
    ) {}

    static create(params: {
        id: string;
        userId: string;
        projectId: string;
        name: string;
        description?: string;
        createdAt?: Date;
    }): Task {
        return new Task(
            params.id,
            params.userId,
            params.projectId,
            this.normalizeCreatedAt(params.createdAt ?? new Date()),
            TaskName.create(params.name),
            params.description ?? '',
            TaskStatusValues.OPEN,
        );
    }

    toggleStatus() {
        this.status = toggleTaskStatus(this.status);
    }

    toPrimitives() {
        return {
            id: this.id,
            userId: this.userId,
            projectId: this.projectId,
            createdAt: this.createdAt,
            name: this.name.getValue(),
            description: this.description,
            status: this.status,
        };
    }

    private static normalizeCreatedAt(date: Date): Date {
        const copy = new Date(date);
        copy.setUTCSeconds(0, 0);
        return copy;
    }
}
