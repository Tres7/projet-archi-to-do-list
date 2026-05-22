import { describe, expect, test } from '@jest/globals';
import { TaskName } from '../../../src/domain/value-objects/task-name.vo.ts';
import {
    TaskStatusValues,
    toggleTaskStatus,
} from '../../../src/domain/value-objects/task-status.vo.ts';

describe('task value objects', () => {
    test('TaskName trims valid names and rejects invalid names', () => {
        expect(TaskName.create(' Task ').getValue()).toBe('Task');
        expect(() => TaskName.create(' ')).toThrow('Task name is required');
        expect(() => TaskName.create('x'.repeat(121))).toThrow(
            'Task name is too long',
        );
    });

    test('TaskStatusValues and toggleTaskStatus expose task state changes', () => {
        expect(TaskStatusValues).toEqual({
            OPEN: 'OPEN',
            DONE: 'DONE',
        });
        expect(toggleTaskStatus('OPEN')).toBe('DONE');
        expect(toggleTaskStatus('DONE')).toBe('OPEN');
    });
});
