import { Project, type ProjectStatus } from '../../../modules/project/domain/entities/Project.ts';
import type { ProjectRepository } from '../../../modules/project/domain/repositories/ProjectRepository.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

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

export class SqliteProjectRepository implements ProjectRepository {
    constructor(private readonly connection: SqliteConnection) {}

    async getProjects(ownerId: string): Promise<Project[]> {
        const rows = await this.connection.all(
            'SELECT * FROM projects WHERE owner_id=?',
            [ownerId],
        );
        return rows.map(normalizeRow);
    }

    async getProject(id: string): Promise<Project | undefined> {
        const rows = await this.connection.all(
            'SELECT * FROM projects WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeProject(project: Project): Promise<void> {
        await this.connection.run(
            `INSERT INTO projects (id, name, description, status, uncomplete_task_count, tasks, owner_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [project.id, project.name, project.description, project.status, project.uncompleteTaskCount, JSON.stringify(project.tasks), project.owner_id],
        );
    }

    async updateProject(id: string, status: ProjectStatus): Promise<void> {
        await this.connection.run(
            'UPDATE projects SET status=? WHERE id=?',
            [status, id],
        );
    }

    async removeProject(id: string): Promise<void> {
        await this.connection.run('DELETE FROM projects WHERE id=?', [id]);
    }
}
