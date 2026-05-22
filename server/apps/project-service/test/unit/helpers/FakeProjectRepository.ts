import { Project } from '../../../src/domain/entities/Project.ts';
import type { ProjectRepository } from '../../../src/domain/repositories/ProjectRepository.ts';
import { OpenTaskCount } from '../../../src/domain/value-objects/open-task-count.vo.ts';
import { ProjectName } from '../../../src/domain/value-objects/project-name.vo.ts';

export class FakeProjectRepository implements ProjectRepository {
    readonly savedProjects: Project[] = [];
    readonly deletedProjectIds: string[] = [];

    private readonly projects = new Map<string, Project>();

    constructor(projects: Project[] = []) {
        for (const project of projects) {
            this.projects.set(project.id, this.copy(project));
        }
    }

    async findById(id: string): Promise<Project | null> {
        const project = this.projects.get(id);
        return project ? this.copy(project) : null;
    }

    async findByOwnerId(ownerId: string): Promise<Project[]> {
        return [...this.projects.values()]
            .filter((project) => project.ownerId === ownerId)
            .map((project) => this.copy(project));
    }

    async save(project: Project): Promise<void> {
        const storedProject = this.copy(project);
        this.savedProjects.push(storedProject);
        this.projects.set(storedProject.id, storedProject);
    }

    async delete(projectId: string): Promise<void> {
        this.deletedProjectIds.push(projectId);
        this.projects.delete(projectId);
    }

    private copy(project: Project): Project {
        return new Project(
            project.id,
            project.ownerId,
            ProjectName.create(project.name.getValue()),
            project.description,
            project.status,
            OpenTaskCount.create(project.openTaskCount.getValue()),
        );
    }
}
