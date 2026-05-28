declare global {
    namespace Express {
        interface Request {
            currentUser: {
                userId: string;
                username: string;
                email: string;
            };
        }
    }
}

export {};
