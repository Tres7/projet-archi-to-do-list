import type { Request, Response } from 'express';
import type { TodoService } from '../../../application/Service/TodoService.ts';

export class TodoController {
    constructor(private readonly todoService: TodoService) {}

    getTodos = async (_req: Request, res: Response) => {
        try {
            res.send(await this.todoService.getAllTodos());
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch todos' });
        }
    };

    addTodo = async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name).trim();
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(await this.todoService.createTodo(name));
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to create todo' });
        }
    };

    updateTodo = async (req: Request<{ id: string }>, res: Response) => {
        try {
            const name = String(req.body?.name).trim();
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
            console.error(e);
            res.status(500).json({ error: 'Failed to update todo' });
        }
    };

    deleteTodo = async (req: Request<{ id: string }>, res: Response) => {
        try {
            await this.todoService.deleteTodo(String(req.params.id));
            res.sendStatus(200);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to delete todo' });
        }
    };
}
