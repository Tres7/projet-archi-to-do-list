import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";

export class GetAllTodos {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(): Promise<Todo[]> {
    return this.todoRepository.findAll();
  }
}