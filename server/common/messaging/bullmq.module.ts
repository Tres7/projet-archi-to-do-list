import crypto from 'node:crypto';
import { Queue, Worker, type Job } from 'bullmq';

import type { MessageBus } from '../messaging/MessageBus.ts';
import type { EventEnvelope } from '../contracts/events/event-envelope.ts';
import type { EventName } from '../contracts/events/event-names.ts';
import type { EventPayloadMap } from '../contracts/events/event-map.ts';
import type { BullMqConfig } from './bullmq.types.ts';

type AnyEnvelope = EventEnvelope<any, any>;
type AnyHandler = (event: AnyEnvelope) => Promise<void>;
type AnyRequestHandler = (event: AnyEnvelope) => Promise<any>;

type QueueHandlers = {
    subscribers: Map<string, AnyHandler>;
    responders: Map<
        string,
        { responseName: string; handler: AnyRequestHandler }
    >;
};

export function createBullMqMessageBus(config: BullMqConfig): MessageBus {
    const connection = {
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null as any,
    };

    const prefix = config.prefix ?? 'todo';
    const concurrency = config.concurrency ?? 10;

    const queues = new Map<string, Queue<AnyEnvelope>>();
    const workers = new Map<string, Worker<AnyEnvelope>>();
    const handlerMap = new Map<string, QueueHandlers>();

    const pendingReplies = new Map<
        string,
        {
            expectedName: string;
            resolve: (value: any) => void;
            reject: (reason?: unknown) => void;
            timeout: NodeJS.Timeout;
        }
    >();

    function getQueue(name: string): Queue<AnyEnvelope> {
        let queue = queues.get(name);
        if (!queue) {
            queue = new Queue<AnyEnvelope>(name, { connection, prefix });
            queues.set(name, queue);
        }
        return queue;
    }

    function getQueueHandlers(queue: string): QueueHandlers {
        let handlers = handlerMap.get(queue);
        if (!handlers) {
            handlers = {
                subscribers: new Map(),
                responders: new Map(),
            };
            handlerMap.set(queue, handlers);
        }
        return handlers;
    }

    function createEnvelope<TName extends EventName>(
        name: TName,
        payload: EventPayloadMap[TName],
        meta?: EventEnvelope<TName, EventPayloadMap[TName]>['meta'],
    ): EventEnvelope<TName, EventPayloadMap[TName]> {
        return {
            id: crypto.randomUUID(),
            name,
            version: 1,
            occurredAt: new Date().toISOString(),
            meta,
            payload,
        };
    }

    async function addToQueue(target: string, envelope: AnyEnvelope) {
        const queue = getQueue(target);

        await queue.add(envelope.name, envelope, {
            jobId: envelope.id,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 300 },
        });
    }

    return {
        async publish<TName extends EventName>(
            target: string,
            name: TName,
            payload: EventPayloadMap[TName],
        ): Promise<void> {
            const envelope = createEnvelope(name, payload);
            await addToQueue(target, envelope);
        },

        async request<TReq extends EventName, TRes extends EventName>(
            target: string,
            requestName: TReq,
            responseName: TRes,
            payload: EventPayloadMap[TReq],
            timeoutMs = 5000,
        ): Promise<EventPayloadMap[TRes]> {
            const correlationId = crypto.randomUUID();
            const replyQueue = `reply.${crypto.randomUUID()}`;

            await this.start(replyQueue);

            const result = new Promise<EventPayloadMap[TRes]>(
                (resolve, reject) => {
                    const timeout = setTimeout(() => {
                        pendingReplies.delete(correlationId);
                        reject(
                            new Error(`Timeout waiting for ${responseName}`),
                        );
                    }, timeoutMs);

                    pendingReplies.set(correlationId, {
                        expectedName: responseName,
                        resolve,
                        reject,
                        timeout,
                    });
                },
            );

            const envelope = createEnvelope(requestName, payload, {
                correlationId,
                replyTo: replyQueue,
            });

            await addToQueue(target, envelope);

            return result;
        },

        subscribe<TName extends EventName>(
            queue: string,
            name: TName,
            handler: (
                event: EventEnvelope<TName, EventPayloadMap[TName]>,
            ) => Promise<void>,
        ): void {
            const handlers = getQueueHandlers(queue);
            handlers.subscribers.set(name, handler as AnyHandler);
        },

        respond<TReq extends EventName, TRes extends EventName>(
            queue: string,
            requestName: TReq,
            responseName: TRes,
            handler: (
                event: EventEnvelope<TReq, EventPayloadMap[TReq]>,
            ) => Promise<EventPayloadMap[TRes]>,
        ): void {
            const handlers = getQueueHandlers(queue);
            handlers.responders.set(requestName, {
                responseName,
                handler: handler as AnyRequestHandler,
            });
        },

        async start(queueName: string): Promise<void> {
            if (workers.has(queueName)) return;

            const worker = new Worker<AnyEnvelope>(
                queueName,
                async (job: Job<AnyEnvelope>) => {
                    const event = job.data;

                    const correlationId = event.meta?.correlationId;
                    if (correlationId) {
                        const pending = pendingReplies.get(correlationId);
                        if (pending && event.name === pending.expectedName) {
                            clearTimeout(pending.timeout);
                            pendingReplies.delete(correlationId);
                            pending.resolve(event.payload);
                            return;
                        }
                    }

                    const handlers = getQueueHandlers(queueName);

                    const subscriber = handlers.subscribers.get(event.name);
                    if (subscriber) {
                        await subscriber(event);
                        return;
                    }

                    const responder = handlers.responders.get(event.name);
                    if (responder) {
                        const responsePayload = await responder.handler(event);

                        const replyTo = event.meta?.replyTo;
                        if (!replyTo) {
                            throw new Error(
                                `Missing replyTo for request ${event.name}`,
                            );
                        }

                        const replyEnvelope = createEnvelope(
                            responder.responseName as EventName,
                            responsePayload,
                            {
                                correlationId: event.meta?.correlationId,
                            },
                        );

                        await addToQueue(replyTo, replyEnvelope);
                        return;
                    }

                    throw new Error(
                        `No handler for event ${event.name} on queue ${queueName}`,
                    );
                },
                {
                    connection,
                    prefix,
                    concurrency,
                },
            );

            worker.on('failed', (job, err) => {
                console.error(
                    `[bullmq:${queueName}] failed job=${job?.id}`,
                    err,
                );
            });

            workers.set(queueName, worker);
        },

        async stop(queueName: string): Promise<void> {
            const worker = workers.get(queueName);
            if (worker) {
                await worker.close();
                workers.delete(queueName);
            }
        },

        async close(): Promise<void> {
            for (const queueName of workers.keys()) {
                await this.stop(queueName);
            }

            for (const queue of queues.values()) {
                await queue.close();
            }
            queues.clear();

            for (const pending of pendingReplies.values()) {
                clearTimeout(pending.timeout);
                pending.reject(new Error('MessageBus closed'));
            }
            pendingReplies.clear();
        },
    };
}
