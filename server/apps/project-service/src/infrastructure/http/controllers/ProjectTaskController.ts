import { NotFoundError } from '../../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../../common/errors/UnauthorizedError.ts';
import type { ProjectTaskService } from '../../../application/ProjectTaskService.ts';
import type { Request, Response } from 'express';

export class ProjectTaskController {
    constructor(private readonly projectTaskService: ProjectTaskService) {}

    createTask = async (req: Request, res: Response) => {
        try {
            const result = await this.projectTaskService.requestCreateTask({
                projectId: String(req.params.projectId),
                userId: req.currentUser.userId,
                userEmail: req.currentUser.email,
                name: String(req.body.name),
                description: String(req.body.description ?? ''),
            });
            res.status(201).send(result);
        } catch (e) {
            res.status(500).json({ error: 'Failed to create task' });
        }
    };

    toggleTaskStatus = async (req: Request, res: Response) => {
        try {
            const result =
                await this.projectTaskService.requestToggleTaskStatus({
                    projectId: String(req.params.projectId),
                    taskId: String(req.params.taskId),
                    userId: req.currentUser.userId,
                    userEmail: req.currentUser.email,
                });

            res.status(202).json(result);
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res
                    .status(404)
                    .json({ error: 'Project or Task not found' });
            }

            if (error instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.status(500).json({ error: 'Failed to toggle task status' });
        }
    };

    deleteTask = async (req: Request, res: Response) => {
        try {
            const result = await this.projectTaskService.requestDeleteTask({
                projectId: String(req.params.projectId),
                taskId: String(req.params.taskId),
                userId: req.currentUser.userId,
                userEmail: req.currentUser.email,
            });

            res.status(202).json(result);
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res
                    .status(404)
                    .json({ error: 'Project or Task not found' });
            }

            if (error instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.status(500).json({ error: 'Failed to delete task' });
        }
    };
}
