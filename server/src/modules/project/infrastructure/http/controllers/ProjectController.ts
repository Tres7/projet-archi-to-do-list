import { NotFoundError } from '../../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../../common/errors/UnauthorizedError.ts';
import type { IProjectService } from '../../../application/ProjectService.ts';
import type { Request, Response } from 'express';

export class ProjectController {
    constructor(private readonly projectService: IProjectService) {}

    getProjects = async (req: Request, res: Response) => {
        try {
            res.send(
                await this.projectService.getAllProjects(
                    req.currentUser.userId,
                ),
            );
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    };

    addProject = async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name).trim();

            const description = String(req.body?.description ?? '').trim();

            if (!name) {
                return res.status(400).json({ error: 'name is required' });
            }

            res.send(
                await this.projectService.createProject(
                    name,
                    description,
                    req.currentUser.userId,
                ),
            );
        } catch (e) {
            res.status(500).json({ error: 'Failed to create project' });
        }
    };

    closeProject = async (req: Request, res: Response) => {
        try {
            await this.projectService.closeProject(
                String(req.params.id),
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

            res.status(500).json({ error: 'Failed to close project' });
        }
    };

    deleteProject = async (req: Request, res: Response) => {
        try {
            await this.projectService.deleteProject(
                String(req.params.id),
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
}
