import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

import { CLIENT_NOTIFICATION_EVENT_NAMES } from '../../../../src/domain/types/ClientNotificationEvent.ts';
import { InMemorySseHub } from '../../../../src/infrastructure/sse/InMemorySseHub.ts';

class FakeSseResponse {
    readonly chunks: string[] = [];

    write(chunk: string): boolean {
        this.chunks.push(chunk);
        return true;
    }

    clear(): void {
        this.chunks.length = 0;
    }
}

describe('InMemorySseHub', () => {
    let hub: InMemorySseHub;
    let res: FakeSseResponse;

    beforeEach(() => {
        jest.useFakeTimers();
        hub = new InMemorySseHub();
        res = new FakeSseResponse();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('sends connected event when user subscribes', () => {
        hub.subscribe('user-1', res);

        expect(res.chunks).toContain('event: connected\n');
        expect(res.chunks).toContain(
            `data: ${JSON.stringify({
                type: CLIENT_NOTIFICATION_EVENT_NAMES.CONNECTED,
                refresh: [],
                message: 'SSE connection established',
            })}\n\n`,
        );
    });

    it('publishes events to all connections for a user only', () => {
        const userRes = new FakeSseResponse();
        const secondUserRes = new FakeSseResponse();

        hub.subscribe('user-1', userRes);
        hub.subscribe('user-2', secondUserRes);

        userRes.clear();
        secondUserRes.clear();

        hub.publishToUser(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
                taskId: 'task-1',
                refresh: ['project-details'],
            },
        );

        expect(userRes.chunks).toContain('event: task.created\n');
        expect(userRes.chunks).toContain(
            `data: ${JSON.stringify({
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
                taskId: 'task-1',
                refresh: ['project-details'],
            })}\n\n`,
        );
        expect(secondUserRes.chunks).toEqual([]);
    });

    it('stops publishing to a connection after unsubscribe', () => {
        const unsubscribe = hub.subscribe('user-1', res);

        res.clear();
        unsubscribe();

        hub.publishToUser(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
                taskId: 'task-1',
                refresh: ['project-details'],
            },
        );

        expect(res.chunks).toEqual([]);
    });

    it('writes heartbeat pings while subscribed and clears them on unsubscribe', () => {
        const unsubscribe = hub.subscribe('user-1', res);

        res.clear();
        jest.advanceTimersByTime(25_000);

        expect(res.chunks).toHaveLength(1);
        expect(res.chunks[0]).toMatch(/^: ping /);

        res.clear();
        unsubscribe();
        jest.advanceTimersByTime(25_000);

        expect(res.chunks).toEqual([]);
    });
});
