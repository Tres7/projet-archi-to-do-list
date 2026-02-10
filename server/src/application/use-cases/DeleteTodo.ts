import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";
import { TodoNotFoundException } from "../../domain/exceptions/TodoNotFoundException";

export class DeleteTodo {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(id: string): Promise<void> {
    const todo = await this.todoRepository.findById(id);

    if (!todo) {
      throw new TodoNotFoundException(id);
    }

    await this.todoRepository.remove(id);
  }
}