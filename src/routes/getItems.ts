import { Request, Response } from 'express';
import db from '../persistence/index.js';

export default async (req: Request, res: Response) => {
    const items = await db.getItems();
    res.send(items);
};
