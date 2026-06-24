import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

interface AuthRouteHandlers {
    login(req: Request, res: Response): unknown;
    register(req: Request, res: Response): unknown;
}

function passThrough(_req: Request, _res: Response, next: NextFunction) {
    next();
}

const authRateLimiter =
    process.env.NODE_ENV !== 'production'
        ? passThrough
        : rateLimit({
              windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
              limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
              standardHeaders: true,
              legacyHeaders: false,
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