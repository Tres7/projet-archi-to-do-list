import express from 'express';
import 'dotenv/config';

import { TodoService } from './application/Service/TodoService.ts';
import { todoRouter } from './infrastructure/http/routes/todoRouter.ts';
import { persistence } from './infrastructure/persistence/index.ts';
import { UserService } from './application/Service/UserService.ts';
import { userRouter } from './infrastructure/http/routes/userRouter.ts';
import { authRouter } from './infrastructure/http/routes/authRouter.ts';
import { AuthController } from './infrastructure/http/controllers/AuthController.ts';
import { authMiddleware } from './infrastructure/http/middleware/authMiddleware.ts';
import { AuthService } from './application/Service/AuthService.ts';
import { TodoController } from './infrastructure/http/controllers/TodoController.ts';
import { UserController } from './infrastructure/http/controllers/UserController.ts';

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

const { connection, repositories } = persistence;

const todoService = new TodoService(repositories.todoRepository);
const userService = new UserService(repositories.userRepository);
const authService = new AuthService(repositories.userRepository);

app.use('/auth', authRouter(new AuthController(authService)));
app.use('/users', authMiddleware, userRouter(new UserController(userService)));
app.use('/items', authMiddleware, todoRouter(new TodoController(todoService)));

connection
    .init()
    .then(() => {
        app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

const gracefulShutdown = () => {
    connection
        .teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
