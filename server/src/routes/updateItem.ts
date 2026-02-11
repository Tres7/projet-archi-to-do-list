import type { Request, Response } from 'express';
import db from '../persistence/index.ts';

export default async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    await db.updateItem(id, {
        name: (req.body as any).name,
        completed: (req.body as any).completed,
    });
    const item = await db.getItem(id);
    res.send(item);
};
