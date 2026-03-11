import { UnauthorizedError } from '../../../../../common/errors/UnauthorizedError.ts';
import { OpenTaskCount } from '../value-objects/open-task-count.vo.ts';
import { ProjectName } from '../value-objects/project-name.vo.ts';
import {
    ProjectStatusValues,
    type ProjectStatus,
} from '../value-objects/project-status.vo.ts';

export class Project {
    constructor(
        public readonly id: string,
        public readonly ownerId: string,
        public name: ProjectName,
        public description: string,
        public status: ProjectStatus,
        public openTaskCount: OpenTaskCount,
    ) {}

    static create(params: {
        id: string;
        ownerId: string;
        name: string;
        description?: string;
    }): Project {
        return new Project(
            params.id,
            params.ownerId,
            ProjectName.create(params.name),
            params.description ?? '',
            ProjectStatusValues.OPEN,
            OpenTaskCount.create(0),
        );
    }

    assertOwnedBy(userId: string) {
        if (this.ownerId !== userId) {
            throw new UnauthorizedError();
        }
    }

    assertOpen() {
        if (this.status === ProjectStatusValues.CLOSED) {
            throw new Error('Project is closed');
        }
    }

    close() {
        if (!this.openTaskCount.isZero()) {
            throw new Error('Project cannot be closed while open tasks exist');
        }

        this.status = ProjectStatusValues.CLOSED;
    }

    increaseOpenTaskCount() {
        this.openTaskCount = this.openTaskCount.increment();
    }

    decreaseOpenTaskCount() {
        this.openTaskCount = this.openTaskCount.decrement();
    }

    toPrimitives() {
        return {
            id: this.id,
            ownerId: this.ownerId,
            name: this.name.getValue(),
            description: this.description,
            status: this.status,
            openTaskCount: this.openTaskCount.getValue(),
        };
    }
}
