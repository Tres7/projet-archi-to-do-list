import { describe, expect, jest, test } from '@jest/globals';
import { NotFoundError } from '../../../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../../../common/errors/UnauthorizedError.ts';
import type { ProjectTaskService } from '../../../../../src/application/ProjectTaskService.ts';
import { ProjectTaskController } from '../../../../../src/infrastructure/http/controllers/ProjectTaskController.ts';
import { requestStub, ResponseStub } from '../../../helpers/HttpStubs.ts';

function taskServiceMock(): jest.Mocked<ProjectTaskService> {
    return {
        requestCreateTask: jest.fn<ProjectTaskService['requestCreateTask']>(),
        requestToggleTaskStatus:
            jest.fn<ProjectTaskService['requestToggleTaskStatus']>(),
        requestDeleteTask: jest.fn<ProjectTaskService['requestDeleteTask']>(),
    } as unknown as jest.Mocked<ProjectTaskService>;
}

describe('ProjectTaskController', () => {
    test('createTask passes request data to service and maps failures', async () => {
        const service = taskServiceMock();
        service.requestCreateTask.mockResolvedValueOnce({
            accepted: true,
            operationId: 'operation-1',
            resourceId: 'task-1',
        });
        const controller = new ProjectTaskController(service);
        const response = new ResponseStub();

        await controller.createTask(
            requestStub({
                params: { projectId: 'project-1' },
                body: { name: 'Task', description: 'Description' },
            }) as never,
            response as never,
        );

        expect(service.requestCreateTask).toHaveBeenCalledWith({
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'alice@example.com',
            name: 'Task',
            description: 'Description',
        });
        expect(response.statusCode).toBe(201);
        expect(response.sendBody).toEqual({
            accepted: true,
            operationId: 'operation-1',
            resourceId: 'task-1',
        });

        service.requestCreateTask.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.createTask(
            requestStub({ params: { projectId: 'project-1' } }) as never,
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Failed to create task' });
    });

    test('toggleTaskStatus maps success and known errors', async () => {
        const service = taskServiceMock();
        service.requestToggleTaskStatus.mockResolvedValue({
            accepted: true,
            operationId: 'operation-1',
            resourceId: 'task-1',
        });
        const controller = new ProjectTaskController(service);
        const response = new ResponseStub();

        await controller.toggleTaskStatus(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            response as never,
        );

        expect(service.requestToggleTaskStatus).toHaveBeenCalledWith({
            projectId: 'project-1',
            taskId: 'task-1',
            userId: 'user-1',
            userEmail: 'alice@example.com',
        });
        expect(response.statusCode).toBe(202);
        expect(response.jsonBody).toEqual({
            accepted: true,
            operationId: 'operation-1',
            resourceId: 'task-1',
        });

        service.requestToggleTaskStatus.mockRejectedValueOnce(
            new NotFoundError(),
        );
        const missing = new ResponseStub();
        await controller.toggleTaskStatus(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            missing as never,
        );
        expect(missing.statusCode).toBe(404);

        service.requestToggleTaskStatus.mockRejectedValueOnce(
            new UnauthorizedError(),
        );
        const forbidden = new ResponseStub();
        await controller.toggleTaskStatus(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            forbidden as never,
        );
        expect(forbidden.statusCode).toBe(403);

        service.requestToggleTaskStatus.mockRejectedValueOnce(
            new Error('boom'),
        );
        const failed = new ResponseStub();
        await controller.toggleTaskStatus(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({
            error: 'Failed to toggle task status',
        });
    });

    test('deleteTask maps success and known errors', async () => {
        const service = taskServiceMock();
        service.requestDeleteTask.mockResolvedValue({
            accepted: true,
            operationId: 'operation-1',
            resourceId: 'task-1',
        });
        const controller = new ProjectTaskController(service);
        const response = new ResponseStub();

        await controller.deleteTask(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            response as never,
        );

        expect(service.requestDeleteTask).toHaveBeenCalledWith({
            projectId: 'project-1',
            taskId: 'task-1',
            userId: 'user-1',
            userEmail: 'alice@example.com',
        });
        expect(response.statusCode).toBe(202);

        service.requestDeleteTask.mockRejectedValueOnce(new NotFoundError());
        const missing = new ResponseStub();
        await controller.deleteTask(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            missing as never,
        );
        expect(missing.statusCode).toBe(404);

        service.requestDeleteTask.mockRejectedValueOnce(
            new UnauthorizedError(),
        );
        const forbidden = new ResponseStub();
        await controller.deleteTask(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            forbidden as never,
        );
        expect(forbidden.statusCode).toBe(403);

        service.requestDeleteTask.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.deleteTask(
            requestStub({
                params: { projectId: 'project-1', taskId: 'task-1' },
            }) as never,
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Failed to delete task' });
    });
});
