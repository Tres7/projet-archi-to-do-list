import type { Request, Response } from 'express';
import db from '../persistence/index.ts';
import { TodoService } from '../application/Service/TodoService.ts';

export default async (req: Request, res: Response) => {
    const todoService = new TodoService();
    const items = await todoService.getAllTodos();
    res.send(items);
};