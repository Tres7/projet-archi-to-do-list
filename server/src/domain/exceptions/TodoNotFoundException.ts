export class TodoNotFoundException extends Error {
  public readonly todoId: string;

  constructor(id: string) {
    super(`Todo with id "${id}" not found`);
    this.name = 'TodoNotFoundException';
    this.todoId = id;

    Object.setPrototypeOf(this, TodoNotFoundException.prototype);
  }
}