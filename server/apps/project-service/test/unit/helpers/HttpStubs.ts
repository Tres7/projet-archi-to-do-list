import type { Request, Response } from 'express';

export class ResponseStub {
    statusCode = 200;
    jsonBody?: unknown;
    sendBody?: unknown;
    sendStatusCode?: number;

    status(code: number): Response {
        this.statusCode = code;
        return this as unknown as Response;
    }

    json(body: unknown): Response {
        this.jsonBody = body;
        return this as unknown as Response;
    }

    send(body?: unknown): Response {
        this.sendBody = body;
        return this as unknown as Response;
    }

    sendStatus(code: number): Response {
        this.statusCode = code;
        this.sendStatusCode = code;
        return this as unknown as Response;
    }
}

export function requestStub(input: {
    body?: unknown;
    currentUser?: { userId: string; email: string; username?: string };
    params?: Record<string, string>;
}): Request {
    return {
        body: input.body ?? {},
        currentUser: {
            username: input.currentUser?.username ?? 'Alice',
            userId: input.currentUser?.userId ?? 'user-1',
            email: input.currentUser?.email ?? 'alice@example.com',
        },
        params: input.params ?? {},
    } as Request;
}
