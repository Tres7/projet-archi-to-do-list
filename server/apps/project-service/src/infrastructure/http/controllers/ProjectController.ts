import { NotFoundError } from '../../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../../common/errors/UnauthorizedError.ts';
import type { Request, Response } from 'express';
import type { ProjectService } from '../../../application/ProjectService.ts';

export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    getProjects = async (req: Request, res: Response) => {
        try {
            res.send(
                await this.projectService.getProjects(req.currentUser.userId),
            );
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    };

    getProjectDetails = async (req: Request, res: Response) => {
        try {
            const result = await this.projectService.getProjectDetails(
                String(req.params.projectId),
                req.currentUser.userId,
            );
            res.send(result);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch project details' });
        }
    };

    addProject = async (req: Request, res: Response) => {
        try {
            const result = await this.projectService.requestCreateProject({
                ownerId: req.currentUser.userId,
                ownerEmail: req.currentUser.email,
                name: String(req.body.name),
                description: String(req.body.description ?? ''),
            });
            res.status(201).send(result);
        } catch (e) {
            res.status(500).json({ error: 'Failed to create project' });
        }
    };

    closeProject = async (req: Request, res: Response) => {
        try {
            await this.projectService.requestCloseProject({
                projectId: String(req.params.projectId),
                ownerId: req.currentUser.userId,
                ownerEmail: req.currentUser.email,
            });
            res.sendStatus(200);
        } catch (e) {
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.status(500).json({ error: 'Failed to close project' });
        }
    };

    deleteProject = async (req: Request, res: Response) => {
        try {
            await this.projectService.deleteProject(
                String(req.params.projectId),
                req.currentUser.userId,
            );
            res.sendStatus(200);
        } catch (e) {
            if (e instanceof NotFoundError) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (e instanceof UnauthorizedError) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.status(500).json({ error: 'Failed to delete project' });
        }
    };

    createTask = async (req: Request, res: Response) => {
        try {
            const result = await this.projectService.requestCreateTask({
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
            const result = await this.projectService.requestToggleTaskStatus({
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
            const result = await this.projectService.requestDeleteTask({
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
