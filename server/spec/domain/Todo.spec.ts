import { Todo } from "../../src/domain/entities/Todo.ts";
import { describe, it, expect} from '@jest/globals';

describe("Todo entity", () => {
  it("toggles completed", () => {
    const todo = new Todo("id", "title", false);
    todo.toggleComplete();
    expect(todo.completed).toBe(true);
  });

});