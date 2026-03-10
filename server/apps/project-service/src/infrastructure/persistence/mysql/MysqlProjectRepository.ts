import { Project } from '../../../domain/entities/Project.ts';
import type { ProjectRepository } from '../../../domain/repositories/ProjectRepository.ts';
import { OpenTaskCount } from '../../../domain/value-objects/open-task-count.vo.ts';
import { ProjectName } from '../../../domain/value-objects/project-name.vo.ts';
import type { ProjectStatus } from '../../../domain/value-objects/project-status.vo.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

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

export class MysqlProjectRepository implements ProjectRepository {
    constructor(private readonly connection: MysqlConnection) {}

    async delete(projectId: string): Promise<void> {
        await this.connection.query('DELETE FROM projects WHERE id = ?', [
            projectId,
        ]);
    }

    async findByOwnerId(ownerId: string): Promise<Project[]> {
        const rows = await this.connection.query(
            `SELECT id, name, description, status, uncomplete_task_count, owner_id
                FROM projects
                WHERE owner_id = ?`,
            [ownerId],
        );

        return rows.map((row) => toProject(row as ProjectRow));
    }

    async findById(id: string): Promise<Project | null> {
        const rows = await this.connection.query(
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

        await this.connection.query(
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
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                status = VALUES(status),
                uncomplete_task_count = VALUES(uncomplete_task_count),
                owner_id = VALUES(owner_id)
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
