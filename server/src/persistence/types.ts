import type { TodoRepository } from "../domain/TodoRepository.ts";

export interface TodoStore extends TodoRepository {
  init(): Promise<void>;
  teardown(): Promise<void>;
}
