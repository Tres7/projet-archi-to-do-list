import { Router } from 'express';
import type { ProjectController } from '../controllers/ProjectController.ts';

export function projectRouter(controller: ProjectController): Router {
    const router = Router();

    router.get('/', controller.getProjects);
    router.get('/:projectId/details', controller.getProjectDetails);

    router.post('/', controller.addProject);
    router.post('/:projectId/close', controller.closeProject);
    router.delete('/:id', controller.deleteProject);

    router.post('/:projectId/tasks', controller.createTask);
    router.patch(
        '/:projectId/tasks/:taskId/toggle-status',
        controller.toggleTaskStatus,
    );
    router.delete('/:projectId/tasks/:taskId', controller.deleteTask);

    return router;
}
