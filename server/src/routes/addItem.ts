import { Request, Response } from 'express';
import db from '../persistence/index.js';
import { v4 as uuid } from 'uuid';
import { TodoItem } from '../todoTypes.js';

export default async (req: Request, res: Response) => {
    const item: TodoItem = {
        id: uuid(),
        name: req.body.name,
        completed: false,
    };

    await db.storeItem(item);
    res.send(item);
};
