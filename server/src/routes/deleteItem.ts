import { Request, Response } from 'express';
import db from '../persistence/index.js';

export default async (req: Request<{ id: string }>, res: Response) => {
    await db.removeItem(req.params.id);
    res.sendStatus(200);
};
