import { describe, expect, test } from '@jest/globals';
import { OpenTaskCount } from '../../../src/domain/value-objects/open-task-count.vo.ts';
import { ProjectName } from '../../../src/domain/value-objects/project-name.vo.ts';
import { ProjectStatusValues } from '../../../src/domain/value-objects/project-status.vo.ts';

describe('project value objects', () => {
    test('ProjectName trims valid names and rejects invalid names', () => {
        expect(ProjectName.create(' Project ').getValue()).toBe('Project');
        expect(() => ProjectName.create(' ')).toThrow(
            'Project name is required',
        );
        expect(() => ProjectName.create('x'.repeat(121))).toThrow(
            'Project name must be between 2 and 120 characters',
        );
    });

    test('OpenTaskCount validates and changes task counts', () => {
        expect(OpenTaskCount.create(0).isZero()).toBe(true);
        expect(OpenTaskCount.create(0).increment().getValue()).toBe(1);
        expect(OpenTaskCount.create(0).decrement().getValue()).toBe(0);
        expect(OpenTaskCount.create(2).decrement().getValue()).toBe(1);
        expect(() => OpenTaskCount.create(-1)).toThrow(
            'Open task count must be a non-negative integer',
        );
        expect(() => OpenTaskCount.create(1.5)).toThrow(
            'Open task count must be a non-negative integer',
        );
    });

    test('ProjectStatusValues exposes supported statuses', () => {
        expect(ProjectStatusValues).toEqual({
            OPEN: 'OPEN',
            CLOSED: 'CLOSED',
        });
    });
});
