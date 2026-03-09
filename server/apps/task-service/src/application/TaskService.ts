import type { ProjectTaskItemDto } from '../../../../common/contracts/queries/project-details.dto.ts';
import type { TaskRepository } from '../domain/repositories/TaskRepository.ts';

export class TaskService {
    constructor(private readonly taskRepository: TaskRepository) {}

    async getTasksByProject(
        projectId: string,
        _userId: string,
    ): Promise<ProjectTaskItemDto[]> {
        const tasks = await this.taskRepository.findByProjectId(projectId);

        return tasks.map((task) => {
            const raw = task.toPrimitives();

            return {
                id: raw.id,
                name: raw.name,
                description: raw.description,
                status: raw.status,
                createdAt: raw.createdAt.toISOString(),
                userId: raw.userId,
                projectId: raw.projectId,
            };
        });
    }
}
