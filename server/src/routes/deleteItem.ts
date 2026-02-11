import type { Request, Response } from 'express';
import db from '../persistence/index.ts';
import { TodoService } from '../application/Service/TodoService.ts';

export default async (req: Request<{ id: string }>, res: Response) => {
    const todoService = new TodoService();
    await todoService.deleteTodo(req.params.id);
    res.sendStatus(200);
};
