import type { Project } from '../entities/Project.ts';

export interface ProjectRepository {
    findById(id: string): Promise<Project | null>;
    findByOwnerId(ownerId: string): Promise<Project[]>;
    save(project: Project): Promise<void>;
    delete(projectId: string): Promise<void>;
}
