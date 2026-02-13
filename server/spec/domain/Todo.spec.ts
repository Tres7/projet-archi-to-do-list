import { Todo } from "../../src/domain/entities/Todo.ts";

describe("Todo entity", () => {
  it("toggles completed", () => {
    const todo = new Todo("id", "title", false);
    todo.toggleComplete();
    expect(todo.completed).toBe(true);
  });

});