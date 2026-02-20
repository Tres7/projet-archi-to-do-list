import type { Request, Response } from 'express';
import type {
    ITodoService,
    TodoService,
} from '../../../application/Service/TodoService.ts';

export class TodoController {
    constructor(private readonly todoService: ITodoService) {}

    getTodos = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            res.send(await this.todoService.getAllTodos(currentUser.userId));
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch todos' });
        }
    };

    addTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const name = String(req.body?.name).trim();
            if (!name)
                return res.status(400).send({ error: 'name is required' });

            res.send(
                await this.todoService.createTodo(name, currentUser.userId),
            );
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to create todo' });
        }
    };

    updateTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

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
            console.error(e);
            res.status(500).json({ error: 'Failed to update todo' });
        }
    };

    deleteTodo = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            await this.todoService.deleteTodo(
                String(req.params.id),
                currentUser.userId,
            );
            res.sendStatus(200);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to delete todo' });
        }
    };
}
