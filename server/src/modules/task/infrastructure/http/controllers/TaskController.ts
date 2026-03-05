import type { Request, Response } from 'express';
import type { ITaskService } from '../../../application/TaskService.ts';
import { UnauthorizedError } from '../../../../../../common/errors/UnauthorizedError.ts';
import { NotFoundError } from '../../../../../../common/errors/NotFoundError.ts';
import type { TaskStatus } from '../../../domain/entities/Task.ts';

export class TaskController {
    constructor(private readonly taskService: ITaskService) {}

    getTasks = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        try {
            res.send(await this.taskService.getAllTasks(currentUser.userId));
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch tasks' });
        }
    };

    addTask = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;
        try {
            const name = String(req.body?.name).trim();
            const description = String(req.body?.description ?? '').trim();
            const projectId = String(req.body?.projectId ?? '').trim();

            if (!name)
                return res.status(400).send({ error: 'name is required' });

            if (!projectId) {
                return res.status(400).json({ error: 'projectId is required' });
            }

            res.send(
                await this.taskService.createTask(
                    name,
                    description,
                    currentUser.userId,
                    projectId,
                ),
            );
        } catch (e) {
            res.status(500).json({ error: 'Failed to create task' });
        }
    };

    updateTask = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;

        const id = String(req.params.id);

        try {
            const name = String(req.body?.name).trim();
            const description = req.body?.description as string | undefined;
            const status = req.body?.status as TaskStatus | undefined;

            res.send(
                await this.taskService.updateTask(id, currentUser.userId,
                    name?.trim(),
                    description?.trim(),
                    status
                ),
            );
        } catch (e) {
            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.status(500).json({ error: 'Failed to update task' });
        }
    };

    deleteTask = async (req: Request, res: Response) => {
        const currentUser = req.currentUser;

        try {
            await this.taskService.deleteTask(
                String(req.params.id),
                currentUser.userId,
            );
            res.sendStatus(200);
        } catch (e) {
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Task not found' });
            }
            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            res.status(500).json({ error: 'Failed to delete task' });
        }
    };
}
