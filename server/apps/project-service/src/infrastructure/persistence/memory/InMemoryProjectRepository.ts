import { Project } from '../../../domain/entities/Project.ts';
import type { ProjectRepository } from '../../../domain/repositories/ProjectRepository.ts';
import { OpenTaskCount } from '../../../domain/value-objects/open-task-count.vo.ts';
import { ProjectName } from '../../../domain/value-objects/project-name.vo.ts';
import type { ProjectStatus } from '../../../domain/value-objects/project-status.vo.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

type ProjectRow = {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    status: ProjectStatus;
    openTaskCount: number;
};

function toProject(row: ProjectRow): Project {
    return new Project(
        row.id,
        row.ownerId,
        ProjectName.create(row.name),
        row.description,
        row.status,
        OpenTaskCount.create(row.openTaskCount),
    );
}

function toRow(project: Project): ProjectRow {
    return project.toPrimitives();
}

export class InMemoryProjectRepository implements ProjectRepository {
    private readonly TABLE_NAME = 'projects';

    constructor(private readonly conn: InMemoryConnection) {}

    async findById(id: string): Promise<Project | null> {
        const row = this.table().get(id);

        if (!row) {
            return null;
        }

        return toProject(row);
    }

    async findByOwnerId(ownerId: string): Promise<Project[]> {
        return Array.from(this.table().values())
            .filter((row) => row.ownerId === ownerId)
            .map(toProject);
    }

    async save(project: Project): Promise<void> {
        this.table().set(project.id, toRow(project));
    }

    async delete(projectId: string): Promise<void> {
        this.table().delete(projectId);
    }

    private table(): Map<string, ProjectRow> {
        return this.conn.table<ProjectRow>(this.TABLE_NAME);
    }
}
