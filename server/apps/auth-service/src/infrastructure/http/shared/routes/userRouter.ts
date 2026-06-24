import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

interface UserRouteHandlers {
    getUserByName(req: Request, res: Response): unknown;
    getUserById(req: Request, res: Response): unknown;
    getUsers(req: Request, res: Response): unknown;
    updateUsername(req: Request, res: Response): unknown;
    changeUserPassword(req: Request, res: Response): unknown;
    deleteUser(req: Request, res: Response): unknown;
}

function passThrough(_req: Request, _res: Response, next: NextFunction) {
    next();
}

const userRateLimiter =
    process.env.NODE_ENV !== 'production'
        ? passThrough
        : rateLimit({
              windowMs: Number(process.env.USER_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
              limit: Number(process.env.USER_RATE_LIMIT_MAX ?? 100),
              standardHeaders: true,
              legacyHeaders: false,
          });

export function userRouter(controller: UserRouteHandlers): Router {
    const router = Router();
    router.get('/username/:name', userRateLimiter, controller.getUserByName);
    router.get('/:id', userRateLimiter, controller.getUserById);
    router.get('/', userRateLimiter, controller.getUsers);
    router.patch('/:id/name', userRateLimiter, controller.updateUsername);
    router.patch('/:id/password', userRateLimiter, controller.changeUserPassword);
    router.delete('/:id', userRateLimiter, controller.deleteUser);

    return router;
}