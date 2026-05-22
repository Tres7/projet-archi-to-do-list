import type { Request, Response } from 'express';

export class ResponseStub {
    statusCode = 200;
    jsonBody?: unknown;

    status(code: number): Response {
        this.statusCode = code;
        return this as unknown as Response;
    }

    json(body: unknown): Response {
        this.jsonBody = body;
        return this as unknown as Response;
    }
}

export function requestStub(): Request {
    return {} as Request;
}
