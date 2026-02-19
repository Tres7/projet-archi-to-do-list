import type { Request, Response } from 'express';
import type { AuthService } from '../../../application/Service/AuthService.ts';

export class AuthController {
    constructor(private readonly authService: AuthService) {}

    async login(req: Request, res: Response) {
        const { username, password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: 'Username and password are required' });
        }
        try {
            const token = await this.authService.login(username, password);
            res.json({ message: 'Login successful', token });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Login failed' });
        }
    }

    async register(req: Request, res: Response) {
        const username = req.body?.username?.trim();
        const password = req.body?.password?.trim();

        if (!username || !password)
            return res
                .status(400)
                .send({ error: 'username and password are required' });

        try {
            const user = await this.authService.register(username, password);
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    async logout(req: Request, res: Response) {
        try {
            res.json({ message: 'Logout successful' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Logout failed' });
        }
    }
}
