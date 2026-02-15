import type { TodoRepository } from "../domain/repositories/TodoRepository.ts";

export interface TodoStore extends TodoRepository {
  init(): Promise<void>;
  teardown(): Promise<void>;
}