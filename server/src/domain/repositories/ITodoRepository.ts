import { Todo } from '../entities/Todo.ts';

export interface ITodoRepository {

    findAll(): Promise<Todo[]>;


    findById(id: string): Promise<Todo | null>;


    save(todo: Todo): Promise<void>;


    update(todo: Todo): Promise<void>;
    

    remove(id: string): Promise<void>;
}