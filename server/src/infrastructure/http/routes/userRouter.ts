import { Router } from 'express';
import type { Request, Response } from 'express';
import type { UserService } from '../../../application/Service/UserService.ts';

export class UserRouter {
    private readonly router = Router();

    constructor(private readonly userService: UserService) {
        this.router.get('/username/:name', this.getUserByName);
        this.router.get('/:id', this.getUserById);
        this.router.get('/', this.getUsers);
        this.router.patch('/:id/name', this.updateUsername);
        this.router.patch('/:id/password', this.changeUserPassword);
        this.router.delete('/:id', this.deleteUser);
    }

    getRouter() {
        return this.router;
    }

    getUsers = async (_req: Request, res: Response) => {
        res.send(await this.userService.getUsers());
    };

    getUserById = async (req: Request<{ id: string }>, res: Response) => {
        const user = await this.userService.getUserById(req.params.id);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(user);
    };

    getUserByName = async (req: Request<{ name: string }>, res: Response) => {
        const user = await this.userService.getUserByUsername(req.params.name);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(user);
    };

    updateUsername = async (
        req: Request<{ id: string; username: string }>,
        res: Response,
    ) => {
        const name = req.body?.username?.trim();
        // todo create validation middleware and move this logic there
        if (!name)
            return res.status(400).send({ error: 'username is required' });

        // todo handle errors with custom error classes and error handling middleware
        try {
            await this.userService.updateUsername(req.params.id, name);
        } catch (e) {
            if (e instanceof Error && e.message === 'User not found') {
                return res.status(404).send({ error: 'User not found' });
            }
            if (
                e instanceof Error &&
                e.message === 'User with that username already exists'
            ) {
                return res
                    .status(409)
                    .send({ error: 'User with that username already exists' });
            }
            throw e;
        }
        res.status(201).send({ message: 'Username updated successfully' });
    };

    changeUserPassword = async (
        req: Request<{ id: string; password: string }>,
        res: Response,
    ) => {
        const password = req.body?.password?.trim();
        if (!password)
            return res.status(400).send({ error: 'password is required' });

        try {
            await this.userService.changeUserPassword(req.params.id, password);
        } catch (e) {
            if (e instanceof Error && e.message === 'User not found') {
                return res.status(404).send({ error: 'User not found' });
            }
            throw e;
        }

        res.status(201).send({ message: 'Password changed successfully' });
    };

    deleteUser = async (req: Request<{ id: string }>, res: Response) => {
        await this.userService.deleteUser(String(req.params.id));
        res.sendStatus(204);
    };
}
