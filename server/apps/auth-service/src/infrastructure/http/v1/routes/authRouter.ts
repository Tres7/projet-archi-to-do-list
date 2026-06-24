import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/AuthController.ts';

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

export function authRouter(controller: AuthController): Router {
    const router = Router();

    router.post('/login', authRateLimiter, (req, res) =>
        controller.login(req, res),
    );
    router.post('/register', authRateLimiter, (req, res) =>
        controller.register(req, res),
    );

    return router;
}