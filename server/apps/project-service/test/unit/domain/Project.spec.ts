import { Project } from '../../../src/domain/entities/Project.ts';
import { ProjectStatusValues } from '../../../src/domain/value-objects/project-status.vo.ts';

describe('Project', () => {
    const projectParams = {
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Test Project',
        description: 'A test project',
    };

    it('should create a project with valid parameters', () => {
        const project = Project.create(projectParams);

        expect(project.id).toBe('project-1');
        const primitiveProject = project.toPrimitives();
        expect(primitiveProject.name).toBe('Test Project');
        expect(primitiveProject.description).toBe('A test project');
        expect(primitiveProject.status).toBe(ProjectStatusValues.OPEN);
        expect(primitiveProject.openTaskCount).toBe(0);
    });

    it('should create a project with empty description', () => {
        const project = Project.create({
            ...projectParams,
            description: '',
        });
        const primitiveProject = project.toPrimitives();
        expect(primitiveProject.description).toBe('');
    });

    it('should throw an error when creating a project with invalid name', () => {
        expect(() => {
            Project.create({
                ...projectParams,
                name: '',
            });
        }).toThrow('Project name is required');

        expect(() => {
            Project.create({
                ...projectParams,
                name: 'a'.repeat(121),
            });
        }).toThrow('Project name must be between 2 and 120 characters');
    });

    it('should throw an error when closing a project with open tasks', () => {
        const project = Project.create(projectParams);
        project.increaseOpenTaskCount();

        expect(() => {
            project.close();
        }).toThrow('Project cannot be closed while open tasks exist');
    });

    it('should close a project with no open tasks', () => {
        const project = Project.create(projectParams);
        project.close();

        const primitiveProject = project.toPrimitives();
        expect(primitiveProject.status).toBe(ProjectStatusValues.CLOSED);
    });

    it('should increment and decrement open task count', () => {
        const project = Project.create(projectParams);
        expect(project.toPrimitives().openTaskCount).toBe(0);

        project.increaseOpenTaskCount();
        expect(project.toPrimitives().openTaskCount).toBe(1);

        project.decreaseOpenTaskCount();
        expect(project.toPrimitives().openTaskCount).toBe(0);

        // Decrementing below zero should not happen
        project.decreaseOpenTaskCount();
        expect(project.toPrimitives().openTaskCount).toBe(0);
    });

    it('should assert ownership correctly', () => {
        const project = Project.create(projectParams);
        expect(() => {
            project.assertOwnedBy('user-1');
        }).not.toThrow();

        expect(() => {
            project.assertOwnedBy('user-2');
        }).toThrow('Unauthorized');
    });

    it('should assert open status correctly', () => {
        const project = Project.create(projectParams);
        expect(() => {
            project.assertOpen();
        }).not.toThrow();

        project.close();
        expect(() => {
            project.assertOpen();
        }).toThrow('Project is closed');
    });
});
