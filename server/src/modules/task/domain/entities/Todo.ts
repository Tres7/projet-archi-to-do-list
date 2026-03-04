export class Todo {
    constructor(
        public readonly id: string,
        public name: string,
        public completed: boolean,
        public userId: string,
    ) {}
}
