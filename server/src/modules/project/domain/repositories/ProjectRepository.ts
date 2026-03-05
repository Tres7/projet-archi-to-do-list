import type { Project, ProjectStatus } from "../entities/Project.ts";

export type ProjectUpdate = {
    status?: ProjectStatus;
    uncompleteTaskCount?: number;
};

export interface ProjectRepository {
    getProjects(ownerId: string): Promise<Project[]>;
    getProject(id: string): Promise<Project | undefined>;
    storeProject(project: Project): Promise<void>;
    updateProject(id: string, update: ProjectUpdate): Promise<void>
    removeProject(id: string): Promise<void>;
}