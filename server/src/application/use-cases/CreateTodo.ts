import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";

export class CreateTodo {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(name: string): Promise<Todo> {
    const todo = new Todo(name);

    await this.todoRepository.save(todo);

    return todo;
  }
}