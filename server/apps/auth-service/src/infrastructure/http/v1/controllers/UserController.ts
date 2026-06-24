import type { Request, Response } from 'express';
import type { IUserService } from '../../../../application/UserService.ts';
import { toUserResponseDTOv1 } from '../dto/toUserResponseDTOv1.ts';
import { BaseUserController } from '../../shared/controllers/BaseUserController.ts';

export class UserController extends BaseUserController {
    getUsers = async (_req: Request, res: Response) => {
        const users = await this.userService.getUsers();
        res.send(users.map(toUserResponseDTOv1));
    };

    getUserById = async (req: Request<{ id: string }>, res: Response) => {
        const user = await this.userService.getUserById(req.params.id);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(toUserResponseDTOv1(user));
    };

    getUserByName = async (req: Request<{ name: string }>, res: Response) => {
        const user = await this.userService.getUserByUsername(req.params.name);
        if (!user) return res.status(404).send({ error: 'User not found' });
        res.send(toUserResponseDTOv1(user));
    };
}
