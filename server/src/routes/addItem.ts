import type { Request, Response } from 'express';
import db from '../persistence/index.ts';
import { v4 as uuid } from 'uuid';
import type { TodoItem } from '../todoTypes.ts';

export default async (req: Request, res: Response) => {
    const item: TodoItem = {
        id: uuid(),
        name: req.body.name,
        completed: false,
    };

    await db.storeItem(item);
    res.send(item);
};
