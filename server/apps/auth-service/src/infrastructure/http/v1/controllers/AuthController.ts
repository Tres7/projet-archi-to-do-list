import type { Request, Response } from 'express';
import { UserAlreadyExistError } from '@app/common/errors/UserAlreadyExistError';
import { BaseAuthController } from '../../shared/controllers/BaseAuthController.ts';

export class AuthController extends BaseAuthController {
    async register(req: Request, res: Response) {
        const username = req.body?.username?.trim();
        const email = req.body?.email?.trim();
        const password = req.body?.password?.trim();

        if (!username || !email || !password)
            return res
                .status(400)
                .send({ error: 'username, email, and password are required' });

        try {
            const user = await this.authService.register(
                username,
                email,
                password,
            );
            res.json(user);
        } catch (error) {
            if (error instanceof UserAlreadyExistError) {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: 'Registration failed' });
        }
    }
}
