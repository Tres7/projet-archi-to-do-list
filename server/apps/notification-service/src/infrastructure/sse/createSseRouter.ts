import { Router, type Request, type Response } from 'express';
import type { InMemorySseHub } from './InMemorySseHub.ts';

function setSseHeaders(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader(
        'Access-Control-Allow-Origin',
        process.env.SSE_ALLOW_ORIGIN || '*',
    );
}

export function createSseRouter(hub: InMemorySseHub) {
    const router = Router();

    router.get('/notifications/events', (req: Request, res: Response) => {
        const userId = String(req.query.userId ?? '').trim();

        if (!userId) {
            res.status(400).json({ message: 'userId is required' });
            return;
        }

        setSseHeaders(res);
        res.flushHeaders?.();

        res.write(`retry: 5000\n\n`);

        const unsubscribe = hub.subscribe(userId, res);

        req.on('close', () => {
            unsubscribe();
            res.end();
        });
    });

    return router;
}
