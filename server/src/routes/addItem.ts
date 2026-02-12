import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';

export default async (req: Request, res: Response) => {
    const addItem = new TodoService();
    const item = await addItem.createTodo(req.body.name);
    res.send(item);
};
