import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';

export const createGetItemsHandler = (todoService: TodoService) => {
    return async (req: Request, res: Response) => {
        const items = await todoService.getAllTodos();
        res.send(items);
    };
};