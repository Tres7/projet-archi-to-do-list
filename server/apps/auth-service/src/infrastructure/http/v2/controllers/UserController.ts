import type { Request, Response } from 'express';
import type { IUserService } from '../../../../application/UserService.ts';
import { NotFoundError } from '@app/common/errors/NotFoundError';
import { UserAlreadyExistError } from '@app/common/errors/UserAlreadyExistError';
import { toUserResponseDTOv2 } from '../dto/toUserResponseDTOv2.ts';

export class UserController {
    constructor(private readonly userService: IUserService) {}

    getUsers = async (_req: Request, res: Response) => {
        const users = await this.userService.getUsers();
        res.send(users.map(toUserResponseDTOv2));
    };

    getUserById = async (req: Request<{ id: string }>, res: Response) => {
        const user = await this.userService.getUserById(req.params.id);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(toUserResponseDTOv2(user));
    };

    getUserByName = async (req: Request<{ name: string }>, res: Response) => {
        const user = await this.userService.getUserByUsername(req.params.name);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(toUserResponseDTOv2(user));
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
