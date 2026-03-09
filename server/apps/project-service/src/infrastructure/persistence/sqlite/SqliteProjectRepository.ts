import { Project } from '../../../domain/entities/Project.ts';
import type { ProjectRepository } from '../../../domain/repositories/ProjectRepository.ts';
import { OpenTaskCount } from '../../../domain/value-objects/open-task-count.vo.ts';
import { ProjectName } from '../../../domain/value-objects/project-name.vo.ts';
import type { ProjectStatus } from '../../../domain/value-objects/project-status.vo.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

type ProjectRow = {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    uncomplete_task_count: number;
    owner_id: string;
};

function toProject(row: ProjectRow): Project {
    return new Project(
        String(row.id),
        String(row.owner_id),
        ProjectName.create(String(row.name)),
        row.description,
        row.status,
        OpenTaskCount.create(Number(row.uncomplete_task_count)),
    );
}

export class SqliteProjectRepository implements ProjectRepository {
    constructor(private readonly connection: SqliteConnection) {}
    delete(projectId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async findByOwnerId(ownerId: string): Promise<Project[]> {
        const rows = await this.connection.all(
            `SELECT id, name, description, status, uncomplete_task_count, owner_id
             FROM projects
             WHERE owner_id = ?`,
            [ownerId],
        );

        return rows.map((row) => toProject(row as ProjectRow));
    }

    async findById(id: string): Promise<Project | null> {
        const rows = await this.connection.all(
            `SELECT id, name, description, status, uncomplete_task_count, owner_id
             FROM projects
             WHERE id = ?`,
            [id],
        );

        if (!rows.length) {
            return null;
        }

        return toProject(rows[0] as ProjectRow);
    }

    async save(project: Project): Promise<void> {
        const raw = project.toPrimitives();

        await this.connection.run(
            `
            INSERT INTO projects (
                id,
                name,
                description,
                status,
                uncomplete_task_count,
                owner_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                status = excluded.status,
                uncomplete_task_count = excluded.uncomplete_task_count,
                owner_id = excluded.owner_id
            `,
            [
                raw.id,
                raw.name,
                raw.description,
                raw.status,
                raw.openTaskCount,
                raw.ownerId,
            ],
        );
    }
}
