import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { TodoService } from '../application/Service/TodoService.ts';

export class TodoRouter {
    private readonly router = Router();

    constructor(private readonly todoService: TodoService) {
        this.router.get('/', this.getTodos);
        this.router.post('/', this.addTodo);
        this.router.put('/:id', this.updateTodo);
        this.router.delete('/:id', this.deleteTodo);
    }

    getRouter() {
        return this.router;
    }

    getTodos = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            res.send(await this.todoService.getAllTodos());
        } catch (e) {
            next(e);
        }
    };

    addTodo = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const name = String(req.body?.name ?? '').trim();
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(await this.todoService.createTodo(name));
        } catch (e) {
            next(e);
        }
    };

    updateTodo = async (
        req: Request<{ id: string }>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const name = String(req.body?.name ?? '').trim();
            const completed = Boolean(req.body?.completed);
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(
                await this.todoService.updateTodo(
                    req.params.id,
                    name,
                    completed,
                ),
            );
        } catch (e) {
            next(e);
        }
    };

    deleteTodo = async (
        req: Request<{ id: string }>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            await this.todoService.deleteTodo(String(req.params.id));
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    };
}
