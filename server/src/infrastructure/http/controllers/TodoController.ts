import { Request, Response } from "express";
import type { ITodoRepository } from "../../../domain/repositories/ITodoRepository";
import { TodoNotFoundException } from "../../../domain/exceptions/TodoNotFoundException";
import { CreateTodo } from "../../../application/use-cases/CreateTodo";
import { GetAllTodos } from "../../../application/use-cases/GetAllTodos";
import { UpdateTodo } from "../../../application/use-cases/UpdateTodo";
import { DeleteTodo } from "../../../application/use-cases/DeleteTodo";


export class TodoController {
  private readonly createTodo: CreateTodo;
  private readonly getAllTodos: GetAllTodos;
  private readonly updateTodo: UpdateTodo;
  private readonly deleteTodo: DeleteTodo;

  constructor(todoRepository: ITodoRepository) {
    this.createTodo = new CreateTodo(todoRepository);
    this.getAllTodos = new GetAllTodos(todoRepository);
    this.updateTodo = new UpdateTodo(todoRepository);
    this.deleteTodo = new DeleteTodo(todoRepository);
  }

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { name } = req.body;

      if (typeof name !== "string") {
        return res.status(400).json({ message: "Missing or invalid 'name'" });
      }

      const todo = await this.createTodo.execute(name);

      return res.status(201).json(todo.toJSON());
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAll(_req: Request, res: Response): Promise<Response> {
    try {
      const todos = await this.getAllTodos.execute();

      return res.status(200).json(todos.map((t) => t.toJSON()));
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async update(req: Request<{ id: string }, any, { name?: string; completed?: boolean }>, 
    res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, completed } = req.body;

      const todo = await this.updateTodo.execute({
        id,
        name,
        completed,
      });

      return res.status(200).json(todo.toJSON());
    } catch (error) {
      if (error instanceof TodoNotFoundException) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async delete(req: Request<{ id: string }>, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      await this.deleteTodo.execute(id);

      return res.sendStatus(204);
    } catch (error) {
      if (error instanceof TodoNotFoundException) {
        return res.status(404).json({ message: error.message });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default TodoController;