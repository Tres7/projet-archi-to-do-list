import type { Todo } from '../entities/Todo.ts';

export type TodoUpdate = {
    name: string;
    completed: boolean;
};

export interface TodoRepository {
  getItems(): Promise<Todo[]>;
  getItem(id: string): Promise<Todo | undefined>;
  storeItem(item: Todo): Promise<void>;
  updateItem(id: string, item: TodoUpdate): Promise<void>;
  removeItem(id: string): Promise<void>;
}