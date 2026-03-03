import { Router } from 'express';
import type { ProjectController } from '../controllers/ProjectController.ts';

export function projectRouter(controller: ProjectController): Router {
    const router = Router();

    router.get('/', controller.getProjects);
    router.post('/', controller.addProject);
    router.patch('/:id/close', controller.closeProject);
    router.delete('/:id', controller.deleteProject);

    return router;
}