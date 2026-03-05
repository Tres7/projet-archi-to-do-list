import { v4 as uuid } from 'uuid';
import { Project } from '../domain/entities/Project.ts';
import { NotFoundError } from '../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError.ts';
import type { ProjectRepository } from '../domain/repositories/ProjectRepository.ts';
import type { EventPublisher } from '../../../infrastructure/messaging/bullmq/bullmq.types.ts';

export interface IProjectService {
    createProject(name: string, description: string, ownerId: string): Promise<Project>;
    closeProject(id: string, ownerId: string): Promise<void>;
    deleteProject(id: string, ownerId: string): Promise<void>;
    getAllProjects(ownerId: string): Promise<Project[]>;
}

export class ProjectService implements IProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly events: EventPublisher    
    ) {}

    async createProject(name: string, description: string, ownerId: string): Promise<Project> {
        const project = new Project(uuid(), name, description, 'opened', 0, [], ownerId);
        await this.projectRepository.storeProject(project);
        return project;
    }


    async closeProject(id: string, ownerId: string): Promise<void> {
        const project = await this.projectRepository.getProject(id);

        if (!project) {
            throw new NotFoundError();
        }

        if (project.owner_id !== ownerId) {
            throw new UnauthorizedError();
        }

        await this.projectRepository.updateProject(id, { status: 'closed' });

        await this.events.publish('project.closed', {
            projectId: id,
            userId: project.owner_id,
            userEmail: 'test@example.com'
        })
    }

    async deleteProject(id: string, ownerId: string): Promise<void> {
        const project = await this.projectRepository.getProject(id);

        if (!project) {
            throw new NotFoundError();
        }

        if (project.owner_id !== ownerId) {
            throw new UnauthorizedError();
        }
        
        await this.projectRepository.removeProject(id);
    }

    async handleTaskCreated(projectId: string): Promise<void> {
        const project = await this.projectRepository.getProject(projectId);
        if (!project) throw new NotFoundError();

        await this.projectRepository.updateProject(projectId, {
            uncompleteTaskCount: project.uncompleteTaskCount + 1
        });
    }

    async handleTaskClosed(projectId: string): Promise<void> {
        const project = await this.projectRepository.getProject(projectId);
        if (!project) throw new NotFoundError();

        const newCount = project.uncompleteTaskCount - 1;

        if (newCount === 0) {
            await this.projectRepository.updateProject(projectId, {
                status: 'closed',
                uncompleteTaskCount: 0,
            });
            await this.events.publish('project.closed', {
                projectId,
                userId: project.owner_id,
                userEmail: 'test@example.com',
            });
        } else {
            await this.projectRepository.updateProject(projectId, {
                uncompleteTaskCount: newCount,
            });
        }
    }

    async handleTaskReopened(projectId: string): Promise<void> {
        const project = await this.projectRepository.getProject(projectId);
        if (!project) throw new NotFoundError();

        await this.projectRepository.updateProject(projectId, {
            uncompleteTaskCount: project.uncompleteTaskCount + 1,
        });
    }

    async getAllProjects(ownerId: string): Promise<Project[]> {
        return this.projectRepository.getProjects(ownerId);
    }
}
