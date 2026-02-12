import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';

export const createDeleteItemHandler = (todoService: TodoService) => {
    return async (req: Request<{ id: string }>, res: Response) => {
        await todoService.deleteTodo(req.params.id);
        res.sendStatus(200);
    };
};