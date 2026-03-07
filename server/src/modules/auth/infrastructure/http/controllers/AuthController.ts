import type { Request, Response } from 'express';
import type { IAuthService } from '../../../application/AuthService.ts';
import { InvalidCredentialsError } from '../../../../../../common/errors/InvalidCredentialsError.ts';
import { UserAlreadyExistError } from '../../../../../../common/errors/UserAlreadyExistError.ts';

export class AuthController {
    constructor(private readonly authService: IAuthService) {}

    async login(req: Request, res: Response) {
        const { username, password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: 'Username and password are required' });
        }
        try {
            const token = await this.authService.login(username, password);
            res.json({ token });
        } catch (error) {
            if (error instanceof InvalidCredentialsError) {
                return res.status(401).json({ message: error.message });
            }
            res.status(500).json({ message: 'Login failed' });
        }
    }

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
