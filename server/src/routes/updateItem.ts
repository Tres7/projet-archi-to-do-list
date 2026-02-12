import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';

export const createUpdateItemHandler = (todoService: TodoService) => {
    return async (req: Request, res: Response) => {
        const todo = await todoService.updateTodo(
            req.params.id,
            req.body.name,
            req.body.completed,
        );
        res.send(todo);
    };
};
