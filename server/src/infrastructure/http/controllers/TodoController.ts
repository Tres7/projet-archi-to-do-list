import type { Request, Response } from 'express';
import type { ITodoService } from '../../../application/Service/TodoService.ts';
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError.ts';
import { NotFoundError } from '../../../domain/errors/NotFoundError.ts';

export class TodoController {
    constructor(private readonly todoService: ITodoService) {}

    getTodos = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        try {
            res.send(await this.todoService.getAllTodos(currentUser.userId));
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch todos' });
        }
    };

    addTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        try {
            const name = String(req.body?.name).trim();
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(
                await this.todoService.createTodo(name, currentUser.userId),
            );
        } catch (e) {
            res.status(500).json({ error: 'Failed to create todo' });
        }
    };

    updateTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;

        const id = String(req.params.id);

        try {
            const name = String(req.body?.name).trim();
            const completed = Boolean(req.body?.completed);
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(
                await this.todoService.updateTodo(
                    id,
                    name,
                    completed,
                    currentUser.userId,
                ),
            );
        } catch (e) {
            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            res.status(500).json({ error: 'Failed to update todo' });
        }
    };

    deleteTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;

        try {
            await this.todoService.deleteTodo(
                String(req.params.id),
                currentUser.userId,
            );
            res.sendStatus(200);
        } catch (e) {
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            res.status(500).json({ error: 'Failed to delete todo' });
        }
    };
}
