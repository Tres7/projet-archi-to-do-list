import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';


export const createAddItemHandler = (todoService: TodoService) => {
    return async (req: Request, res: Response) => {
        const todo = await todoService.createTodo(req.body.name);
        res.send(todo);
    };
};
