import { describe, expect, jest, test } from '@jest/globals';
import { NotFoundError } from '../../../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../../../common/errors/UnauthorizedError.ts';
import type { ProjectService } from '../../../../../src/application/ProjectService.ts';
import { ProjectController } from '../../../../../src/infrastructure/http/controllers/ProjectController.ts';
import { requestStub, ResponseStub } from '../../../helpers/HttpStubs.ts';

function projectServiceMock(): jest.Mocked<ProjectService> {
    return {
        createProject: jest.fn<ProjectService['createProject']>(),
        closeProject: jest.fn<ProjectService['closeProject']>(),
        deleteProject: jest.fn<ProjectService['deleteProject']>(),
        getProjects: jest.fn<ProjectService['getProjects']>(),
        getProjectDetails: jest.fn<ProjectService['getProjectDetails']>(),
    } as unknown as jest.Mocked<ProjectService>;
}

describe('ProjectController', () => {
    test('getProjects sends projects for current user and maps failures', async () => {
        const service = projectServiceMock();
        service.getProjects.mockResolvedValueOnce([
            {
                id: 'project-1',
                ownerId: 'user-1',
                name: 'Project',
                description: 'Description',
                status: 'OPEN',
                openTaskCount: 0,
            },
        ]);
        const controller = new ProjectController(service);
        const response = new ResponseStub();

        await controller.getProjects(
            requestStub({ currentUser: { userId: 'user-1', email: 'a@b.c' } }),
            response as never,
        );

        expect(service.getProjects).toHaveBeenCalledWith('user-1');
        expect(response.sendBody).toEqual([
            {
                id: 'project-1',
                ownerId: 'user-1',
                name: 'Project',
                description: 'Description',
                status: 'OPEN',
                openTaskCount: 0,
            },
        ]);

        service.getProjects.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.getProjects(requestStub({}), failed as never);
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({
            error: 'Failed to fetch projects',
        });
    });

    test('getProjectDetails sends details and maps failures', async () => {
        const service = projectServiceMock();
        service.getProjectDetails.mockResolvedValueOnce({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Project',
            description: '',
            status: 'OPEN',
            openTaskCount: 0,
            tasks: [],
        });
        const controller = new ProjectController(service);
        const response = new ResponseStub();

        await controller.getProjectDetails(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            response as never,
        );

        expect(service.getProjectDetails).toHaveBeenCalledWith(
            'project-1',
            'user-1',
        );
        expect(response.sendBody).toEqual({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Project',
            description: '',
            status: 'OPEN',
            openTaskCount: 0,
            tasks: [],
        });

        service.getProjectDetails.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.getProjectDetails(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({
            error: 'Failed to fetch project details',
        });
    });

    test('addProject passes current user and request body to service', async () => {
        const service = projectServiceMock();
        const controller = new ProjectController(service);
        const response = new ResponseStub();

        await controller.addProject(
            requestStub({
                body: { name: 'Project', description: 'Description' },
                currentUser: { userId: 'user-1', email: 'alice@example.com' },
            }),
            response as never,
        );

        expect(service.createProject).toHaveBeenCalledWith({
            ownerId: 'user-1',
            ownerEmail: 'alice@example.com',
            name: 'Project',
            description: 'Description',
        });
        expect(response.statusCode).toBe(201);

        service.createProject.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.addProject(
            requestStub({ body: { name: 'P' } }),
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Failed to create project' });
    });

    test('closeProject maps success and known errors', async () => {
        const service = projectServiceMock();
        const controller = new ProjectController(service);
        const response = new ResponseStub();

        await controller.closeProject(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            response as never,
        );

        expect(service.closeProject).toHaveBeenCalledWith({
            projectId: 'project-1',
            ownerId: 'user-1',
            ownerEmail: 'alice@example.com',
        });
        expect(response.sendStatusCode).toBe(200);

        service.closeProject.mockRejectedValueOnce(new NotFoundError());
        const missing = new ResponseStub();
        await controller.closeProject(
            requestStub({ params: { projectId: 'missing' } }) as never,
            missing as never,
        );
        expect(missing.statusCode).toBe(404);
        expect(missing.jsonBody).toEqual({ error: 'Project not found' });

        service.closeProject.mockRejectedValueOnce(new UnauthorizedError());
        const forbidden = new ResponseStub();
        await controller.closeProject(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            forbidden as never,
        );
        expect(forbidden.statusCode).toBe(403);

        service.closeProject.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.closeProject(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Failed to close project' });
    });

    test('deleteProject maps success and known errors', async () => {
        const service = projectServiceMock();
        const controller = new ProjectController(service);
        const response = new ResponseStub();
        const consoleLog = jest
            .spyOn(console, 'log')
            .mockImplementation(() => undefined);

        try {
            await controller.deleteProject(
                requestStub({ params: { projectId: 'project-1' } }) as never,
                response as never,
            );

            expect(service.deleteProject).toHaveBeenCalledWith(
                'project-1',
                'user-1',
            );
            expect(response.sendStatusCode).toBe(200);

            service.deleteProject.mockRejectedValueOnce(new NotFoundError());
            const missing = new ResponseStub();
            await controller.deleteProject(
                requestStub({ params: { projectId: 'missing' } }) as never,
                missing as never,
            );
            expect(missing.statusCode).toBe(404);

            service.deleteProject.mockRejectedValueOnce(
                new UnauthorizedError(),
            );
            const forbidden = new ResponseStub();
            await controller.deleteProject(
                requestStub({ params: { projectId: 'project-1' } }) as never,
                forbidden as never,
            );
            expect(forbidden.statusCode).toBe(403);

            service.deleteProject.mockRejectedValueOnce(new Error('boom'));
            const failed = new ResponseStub();
            await controller.deleteProject(
                requestStub({ params: { projectId: 'project-1' } }) as never,
                failed as never,
            );
            expect(failed.statusCode).toBe(500);
            expect(failed.jsonBody).toEqual({
                error: 'Failed to delete project',
            });
        } finally {
            consoleLog.mockRestore();
        }
    });
});
