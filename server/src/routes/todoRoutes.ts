import { Router } from 'express';
import type { TodoService } from '../application/Service/TodoService.ts';

export const createTodoRouter = (todoService: TodoService): Router => {
    const router = Router();

    router.get('/', async (req, res) => {
        const todos = await todoService.getAllTodos();
        res.send(todos);
    });

    router.post('/', async (req, res) => {
        const todo = await todoService.createTodo(req.body.name);
        res.status(201).send(todo);
    });

    router.put('/:id', async (req, res) => {
        const todo = await todoService.updateTodo(
            req.params.id,
            req.body.name,
            req.body.completed,
        );
        if (!todo) {
            res.status(404).send({ error: 'Todo not found' });
            return;
        }
        res.send(todo);
    });

    router.delete('/:id', async (req, res) => {
        await todoService.deleteTodo(req.params.id);
        res.sendStatus(204);
    });

    return router;
}