import express from 'express';
import 'dotenv/config';
import { SqliteTodoRepository } from './infrastructure/persistence/SqliteTodoRepository.ts';
import { TodoService } from './application/Service/TodoService.ts';
import { createTodoRouter } from './routes/todoRoutes.ts';
import db from './persistence/index.ts';
import { createGetItemsHandler } from './routes/getItems.ts';
import { createAddItemHandler } from './routes/addItem.ts';
import { createUpdateItemHandler } from './routes/updateItem.ts';
import { createDeleteItemHandler } from './routes/deleteItem.ts';


const app = express();
app.use(express.json());

const todoRepository = new SqliteTodoRepository();
const todoService = new TodoService(todoRepository);

app.use('/items', createTodoRouter(todoService));
/*
app.get('/items', createGetItemsHandler);
app.post('/items', createAddItemHandler);
app.put('/items/:id', createUpdateItemHandler);
app.delete('/items/:id', createDeleteItemHandler);*/

todoRepository
    .init()
    .then(() => {
        app.listen(3000, () => console.log('Listening on port 3000'));
    })
    .catch((err : any) => {
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
