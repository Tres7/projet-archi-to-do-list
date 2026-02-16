import express from 'express';
import 'dotenv/config';

import db from './persistence/index.ts';
import { TodoService } from './application/Service/TodoService.ts';
import { TodoRouter } from './routes/todoRouter.ts';

const app = express();

app.use(express.json());

const todoService = new TodoService(db);
const todoRouter = new TodoRouter(todoService);
app.use('/items', todoRouter.getRouter());

db.init()
    .then(() => {
        app.listen(3000, () => console.log('Listening on port 3000'));
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
