import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';

interface AuthRouteHandlers {
    login(req: Request, res: Response): unknown;
    register(req: Request, res: Response): unknown;
}

const authRateLimiter = rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== 'production',
});

export function authRouter(controller: AuthRouteHandlers): Router {
    const router = Router();

    router.post('/login', authRateLimiter, (req, res) =>
        controller.login(req, res),
    );
    router.post('/register', authRateLimiter, (req, res) =>
        controller.register(req, res),
    );

    return router;
}