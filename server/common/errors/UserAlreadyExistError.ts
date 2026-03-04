export class UserAlreadyExistError extends Error {
    constructor() {
        super('User with that username already exists');
        this.name = 'UserAlreadyExistError';
    }
}
