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
    headers?: Record<string, string>;
    params?: Record<string, string>;
}): Request {
    return {
        body: input.body ?? {},
        headers: input.headers ?? {},
        params: input.params ?? {},
    } as Request;
}
