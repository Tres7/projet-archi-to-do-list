import { Router } from 'express';
import type { TodoController } from '../controllers/TodoController.ts';

export function todoRouter(controller: TodoController): Router {
    const router = Router();

    router.get('/', controller.getTodos);
    router.post('/', controller.addTodo);
    router.put('/:id', controller.updateTodo);
    router.delete('/:id', controller.deleteTodo);

    return router;
}
