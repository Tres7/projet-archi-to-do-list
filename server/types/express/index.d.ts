import type { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            currentUser: {
                userId: string;
                username: string;
            };
        }
    }
}

export {};
