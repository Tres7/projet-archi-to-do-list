import db from '../persistence/index.js';
import { v4 as uuid } from 'uuid';

export default async (req, res) => {
    const item = {
        id: uuid(),
        name: req.body.name,
        completed: false,
    };

    await db.storeItem(item);
    res.send(item);
};
