import {
    Project,
} from '../../../domain/entities/Project.ts';
import type { ProjectRepository } from '../../../domain/repositories/ProjectRepository.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

function normalizeRow(row: any): Project {
    return new Project(
        String(row.id),
        String(row.name),
        String(row.description),
        row.status,
        Number(row.uncomplete_task_count),
        JSON.parse(row.tasks),
        String(row.owner_id),
    );
}

export class MysqlProjectRepository implements ProjectRepository {
    constructor(private readonly conn: MysqlConnection) {}

    async getProjects(ownerId: string): Promise<Project[]> {
        const rows = await this.conn.query(
            'SELECT * FROM projects WHERE owner_id=?',
            [ownerId],
        );
        return rows.map(normalizeRow);
    }

    async getProject(id: string): Promise<Project | undefined> {
        const rows = await this.conn.query(
            'SELECT * FROM projects WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeProject(project: Project): Promise<void> {
        await this.conn.query(
            `INSERT INTO projects (id, name, description, status, uncomplete_task_count, tasks, owner_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                project.id,
                project.name,
                project.description,
                project.status,
                project.uncompleteTaskCount,
                JSON.stringify(project.tasks),
                project.owner_id,
            ],
        );
    }

    async updateProject(id: string, status: ProjectStatus): Promise<void> {
        await this.conn.query('UPDATE projects SET status=? WHERE id=?', [
            status,
            id,
        ]);
    }

    async removeProject(id: string): Promise<void> {
        await this.conn.query('DELETE FROM projects WHERE id=?', [id]);
    }
}
