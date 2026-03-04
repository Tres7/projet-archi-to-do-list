import { Router } from 'express';
import type { TaskController } from '../controllers/TaskController.ts';

export function taskRouter(controller: TaskController): Router {
    const router = Router();

    router.get('/', controller.getTasks);
    router.post('/', controller.addTask);
    router.put('/:id', controller.updateTask);
    router.delete('/:id', controller.deleteTask);

    return router;
}
