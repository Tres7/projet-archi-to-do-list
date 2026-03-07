export type BullMqConfig = {
    redis: {
        host: string;
        port: number;
    };
    prefix?: string;
    concurrency?: number;
};
