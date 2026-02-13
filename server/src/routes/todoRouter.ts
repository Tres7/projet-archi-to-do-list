import { Router } from 'express';
import type { Request, Response } from 'express';
import { TodoService } from '../application/Service/TodoService.ts';


const todoRouter = Router();

export async function getTodos (req: Request, res: Response) {
    const todoService = new TodoService();
    const items = await todoService.getAllTodos();
    res.send(items);
};

export async function addTodo (req: Request, res: Response) {
    const addItem = new TodoService();
    const item = await addItem.createTodo(req.body.name);
    res.send(item);
};


export async function updateTodo (req: Request<{ id: string }>, res: Response) {
    const todoService = new TodoService();
    const item = await todoService.updateTodo(req.params.id, req.body.name, req.body.completed);
    res.send(item);
};


export async function deleteTodo (req: Request<{ id: string }>, res: Response) {
    const todoService = new TodoService();
    await todoService.deleteTodo(req.params.id);
    res.sendStatus(200);
};


todoRouter.get('/', getTodos);
todoRouter.post('/', addTodo);
todoRouter.put('/:id', updateTodo);
todoRouter.delete('/:id', deleteTodo);

export default todoRouter;