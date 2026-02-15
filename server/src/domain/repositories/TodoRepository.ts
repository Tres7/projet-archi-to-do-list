import type { TodoItem } from '../../todoTypes.ts';

export type TodoUpdate = Pick<TodoItem, 'name' | 'completed'>;

export interface TodoRepository {
  getItems(): Promise<TodoItem[]>;
  getItem(id: string): Promise<TodoItem | undefined>;
  storeItem(item: TodoItem): Promise<void>;
  updateItem(id: string, item: TodoUpdate): Promise<void>;
  removeItem(id: string): Promise<void>;
}