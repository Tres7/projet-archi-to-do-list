import { Project } from '../../../domain/entities/Project.ts';
import type { ProjectRepository } from '../../../domain/repositories/ProjectRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryProjectRepository implements ProjectRepository {
    private TABLE_NAME = 'projects';
    constructor(private readonly conn: InMemoryConnection) {}

    private table() {
        return this.conn.table<Project>(this.TABLE_NAME);
    }

    async getProjects(ownerId: string): Promise<Project[]> {
        const items: Project[] = [];
        for (const project of this.table().values()) {
            if (project.owner_id === ownerId) {
                items.push(project);
            }
        }
        return items;
    }

    async getProject(id: string): Promise<Project | undefined> {
        const row = this.table().get(id);
        return row
            ? new Project(
                  row.id,
                  row.name,
                  row.description,
                  row.status,
                  row.uncompleteTaskCount,
                  row.tasks,
                  row.owner_id,
              )
            : undefined;
    }

    async storeProject(project: Project): Promise<void> {
        this.table().set(project.id, project);
    }

    async updateProject(id: string, update: ProjectUpdate): Promise<void> {
        const table = this.table();
        if (!table.has(id)) {
            return;
        }
        const existing = table.get(id)!;
        table.set(
            id,
            new Project(
                existing.id,
                existing.name,
                existing.description,
                update.status ?? existing.status,
                update.uncompleteTaskCount ?? existing.uncompleteTaskCount,
                existing.tasks,
                existing.owner_id,
            ),
        );
    }

    async removeProject(id: string): Promise<void> {
        this.table().delete(id);
    }
}
