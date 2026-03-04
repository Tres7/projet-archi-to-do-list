import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type CurrentUser = {
    userId: string;
    username: string;
};

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error(
                'JWT_SECRET is not defined in environment variables',
            );
        }

        const decoded = jwt.verify(token, secret) as CurrentUser;

        req.currentUser = {
            userId: decoded.userId,
            username: decoded.username,
        };

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}
