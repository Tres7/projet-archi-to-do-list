import express from 'express';
import 'dotenv/config';

import { TodoService } from './application/Service/TodoService.ts';
import { todoRouter } from './infrastructure/http/routes/todoRouter.ts';
import {
    connection,
    todoRepository,
    userRepository,
} from './persistence/index.ts';
import { UserService } from './application/Service/UserService.ts';
import { UserRouter } from './infrastructure/http/routes/userRouter.ts';
import { authRouter } from './infrastructure/http/routes/authRouter.ts';
import { AuthController } from './infrastructure/http/controllers/AuthController.ts';
import { authMiddleware } from './infrastructure/http/middleware/authMiddleware.ts';
import { AuthService } from './application/Service/AuthService.ts';
import { TodoController } from './infrastructure/http/controllers/TodoController.ts';

const app = express();

app.use(express.json());

const todoService = new TodoService(todoRepository);
const userService = new UserService(userRepository);
const authService = new AuthService(userRepository);

const userRouter = new UserRouter(userService);

app.use('/auth', authRouter(new AuthController(authService)));
app.use('/users', userRouter.getRouter());
app.use('/items', todoRouter(new TodoController(todoService)));

connection
    .init()
    .then(() => {
        app.listen(3000, () => console.log('Listening on port 3000'));
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
