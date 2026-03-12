import type { SseEvent, UserPayload } from './types.ts';
import jwt from 'jsonwebtoken';
import { EventSource } from 'eventsource';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export function signTestToken(user: UserPayload): string {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email,
            username: user.username,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
        },
    );
}

export function listen(app: any): Promise<{ server: Server; baseUrl: string }> {
    return new Promise((resolve) => {
        const server = app.listen(0, '127.0.0.1', () => {
            const address = server.address() as AddressInfo;

            resolve({
                server,
                baseUrl: `http://127.0.0.1:${address.port}`,
            });
        });
    });
}

export function closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function openSse(baseUrl: string, userId: string) {
    const source = new EventSource(
        `${baseUrl}/notifications/events?userId=${encodeURIComponent(userId)}`,
    );

    function waitFor(eventName: string, timeoutMs = 7000): Promise<SseEvent> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(
                    new Error(
                        `Timeout while waiting for SSE event "${eventName}"`,
                    ),
                );
            }, timeoutMs);

            const onMessage = (event: any) => {
                cleanup();

                try {
                    resolve({
                        event: eventName,
                        data: JSON.parse(event.data),
                    });
                } catch (error) {
                    reject(error);
                }
            };

            const onError = (error: unknown) => {
                cleanup();
                reject(error);
            };

            const cleanup = () => {
                clearTimeout(timer);
                source.removeEventListener(
                    eventName,
                    onMessage as unknown as EventListener,
                );
                source.removeEventListener(
                    'error',
                    onError as unknown as EventListener,
                );
            };

            source.addEventListener(
                eventName,
                onMessage as unknown as EventListener,
            );
            source.addEventListener(
                'error',
                onError as unknown as EventListener,
            );
        });
    }

    return {
        source,
        waitFor,
        close() {
            source.close();
        },
    };
}
