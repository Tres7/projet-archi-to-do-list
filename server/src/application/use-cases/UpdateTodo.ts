import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";
import { TodoNotFoundException } from "../../domain/exceptions/TodoNotFoundException";

export interface UpdateTodoInput {
  id: string;
  name?: string;
  completed?: boolean;
}

export class UpdateTodo {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: UpdateTodoInput): Promise<Todo> {
    const todo = await this.todoRepository.findById(input.id);

    if (!todo) {
      throw new TodoNotFoundException(input.id);
    }

    todo.update({ name: input.name, completed: input.completed });

    await this.todoRepository.update(todo);

    return todo;
  }
  
}
