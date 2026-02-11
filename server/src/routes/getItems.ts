import type { Request, Response } from 'express';
import db from '../persistence/index.ts';

export default async (req: Request, res: Response) => {
    const items = await db.getItems();
    res.send(items);
};
