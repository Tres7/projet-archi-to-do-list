import type {
    IUserService,
    UserService,
} from '../../../application/Service/UserService.ts';
import type { Request, Response } from 'express';
import { NotFoundError } from '../../../domain/errors/NotFoundError.ts';
import { UserAlreadyExistError } from '../../../domain/errors/UserAlreadyExistError.ts';

export class UserController {
    constructor(private readonly userService: IUserService) {}

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
        if (!name)
            return res.status(400).send({ error: 'username is required' });

        try {
            await this.userService.updateUsername(req.params.id, name);
        } catch (e) {
            if (e instanceof NotFoundError) {
                return res.status(404).send({ error: 'User not found' });
            }
            if (e instanceof UserAlreadyExistError) {
                return res
                    .status(409)
                    .send({ error: 'User with that username already exists' });
            }
        }
        res.status(200).send({ message: 'Username updated successfully' });
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
            if (e instanceof NotFoundError) {
                return res.status(404).send({ error: 'User not found' });
            }
        }

        res.status(201).send({ message: 'Password changed successfully' });
    };

    deleteUser = async (req: Request<{ id: string }>, res: Response) => {
        await this.userService.deleteUser(String(req.params.id));
        res.sendStatus(204);
    };
}
