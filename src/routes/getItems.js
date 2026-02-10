import db from '../persistence/index.js';

export default async (req, res) => {
    const items = await db.getItems();
    res.send(items);
};
