import type { Project, ProjectStatus } from "../entities/Project.ts";


export interface ProjectRepository {
    getProjects(ownerId: string): Promise<Project[]>;
    getProject(id: string): Promise<Project | undefined>;
    storeProject(project: Project): Promise<void>;
    updateProject(id: string, status: ProjectStatus): Promise<void>
    removeProject(id: string): Promise<void>;
}