import { Router } from 'express';
import { AuthController } from '../infrastructure/http/controllers/AuthController.ts';

export function authRouter(controller: AuthController): Router {
    const router = Router();

    router.post('/login', (req, res) => controller.login(req, res));
    router.post('/register', (req, res) => controller.register(req, res));
    router.post('/logout', (req, res) => controller.logout(req, res));

    return router;
}
