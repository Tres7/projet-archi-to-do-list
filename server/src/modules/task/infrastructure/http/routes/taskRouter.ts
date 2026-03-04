import { Router } from 'express';
import type { TaskController } from '../controllers/TaskController.ts';

export function taskRouter(controller: TaskController): Router {
    const router = Router();

    router.get('/', controller.getTodos);
    router.post('/', controller.addTodo);
    router.put('/:id', controller.updateTodo);
    router.delete('/:id', controller.deleteTodo);

    return router;
}
