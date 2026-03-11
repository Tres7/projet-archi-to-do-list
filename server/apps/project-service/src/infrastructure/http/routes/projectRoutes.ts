import { Router } from 'express';
import type { ProjectController } from '../controllers/ProjectController.ts';
import type { ProjectTaskController } from '../controllers/ProjectTaskController.ts';

export function projectRouter(
    projectController: ProjectController,
    projectTaskController: ProjectTaskController,
): Router {
    const router = Router();

    router.get('/', projectController.getProjects);
    router.get('/:projectId/details', projectController.getProjectDetails);

    router.post('/', projectController.addProject);
    router.post('/:projectId/close', projectController.closeProject);
    router.delete('/:projectId', projectController.deleteProject);

    router.post('/:projectId/tasks', projectTaskController.createTask);
    router.patch(
        '/:projectId/tasks/:taskId/toggle-status',
        projectTaskController.toggleTaskStatus,
    );
    router.delete(
        '/:projectId/tasks/:taskId',
        projectTaskController.deleteTask,
    );

    return router;
}
