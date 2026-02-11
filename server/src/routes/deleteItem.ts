import type { Request, Response } from 'express';
import db from '../persistence/index.ts';

export default async (req: Request<{ id: string }>, res: Response) => {
    await db.removeItem(req.params.id);
    res.sendStatus(200);
};
