import express from 'express';
import 'dotenv/config';

import { TodoService } from './application/Service/TodoService.ts';
import { TodoRouter } from './routes/todoRouter.ts';
import { connection, todoRepository } from './persistence/index.ts';

const app = express();

app.use(express.json());

const todoService = new TodoService(todoRepository);
const todoRouter = new TodoRouter(todoService);
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
