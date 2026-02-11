import type { Request, Response } from 'express';
import db from '../persistence/index.ts';
import { TodoService } from '../application/Service/TodoService.ts';

export default async (req: Request, res: Response) => {
    const todoService = new TodoService();
    const item = await todoService.updateTodo(req.params.id, req.body.name, req.body.completed);
    res.send(item);
};
