import { Router } from 'express';
import type { UserController } from '../controllers/UserController.ts';

export function userRouter(controller: UserController): Router {
    const router = Router();
    router.get('/username/:name', controller.getUserByName);
    router.get('/:id', controller.getUserById);
    router.get('/', controller.getUsers);
    router.patch('/:id/name', controller.updateUsername);
    router.patch('/:id/password', controller.changeUserPassword);
    router.delete('/:id', controller.deleteUser);

    return router;
}
