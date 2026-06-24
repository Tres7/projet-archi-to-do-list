import { Router, type Request, type Response } from 'express';

interface UserRouteHandlers  {
    getUserByName(req: Request, res: Response): unknown;
    getUserById(req: Request, res: Response): unknown;
    getUsers(req: Request, res: Response): unknown;
    updateUsername(req: Request, res: Response): unknown;
    changeUserPassword(req: Request, res: Response): unknown;
    deleteUser(req: Request, res: Response): unknown;
}

export function userRouter(controller: UserRouteHandlers): Router {
    const router = Router();
    router.get('/username/:name', controller.getUserByName);
    router.get('/:id', controller.getUserById);
    router.get('/', controller.getUsers);
    router.patch('/:id/name', controller.updateUsername);
    router.patch('/:id/password', controller.changeUserPassword);
    router.delete('/:id', controller.deleteUser);

    return router;
}
