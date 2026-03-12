import type { Server } from 'node:http';

export type UserPayload = {
    userId: string;
    email: string;
    username: string;
};

export type RunningProjectApp = {
    app: any;
    stopModules: () => Promise<void>;
    closeConnection?: () => Promise<void>;
};

export type RunningNotificationApp = {
    app: any;
    server: Server;
    baseUrl: string;
    stop: () => Promise<void>;
    closeBus: () => Promise<void>;
};

export type SseEvent = {
    event: string;
    data: any;
};
