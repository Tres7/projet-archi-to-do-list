import express from 'express';
import 'dotenv/config';

import { TodoService } from './application/Service/TodoService.ts';
import { TodoRouter } from './routes/todoRouter.ts';
import {
    connection,
    todoRepository,
    userRepository,
} from './persistence/index.ts';
import { UserService } from './application/Service/UserService.ts';
import { UserRouter } from './routes/userRouter.ts';

const app = express();

app.use(express.json());

const todoService = new TodoService(todoRepository);
const userService = new UserService(userRepository);

const userRouter = new UserRouter(userService);
const todoRouter = new TodoRouter(todoService);

app.use('/users', userRouter.getRouter());
app.use('/items', todoRouter.getRouter());

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
