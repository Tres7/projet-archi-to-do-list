import { Queue, Worker, type Job } from 'bullmq';
import crypto from 'node:crypto';

import type {
    EventEnvelope,
    EventName,
    EventPayloadMap,
} from '../../../common/messaging/events.ts';
import type {
    BrokerConfig,
    EventPublisher,
    EventSubscriber,
    Handler,
    PublisherConfig,
} from './bullmq.types.ts';

export function createBullMqMessaging(config: BrokerConfig) {
    const bullPrefix = config.inboxPrefix ?? 'inbox';

    const connection = {
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null as any,
    };

    const queues = new Map<string, Queue<EventEnvelope>>();

    function getQueue(queueName: string) {
        const existing = queues.get(queueName);
        if (existing) return existing;

        const q = new Queue<EventEnvelope>(queueName, {
            connection,
            prefix: bullPrefix,
        });
        queues.set(queueName, q);
        return q;
    }

    function createPublisher(pubCfg: PublisherConfig): EventPublisher {
        return {
            async publish<TName extends EventName>(
                name: TName,
                payload: EventPayloadMap[TName],
            ) {
                const event: EventEnvelope<TName> = {
                    id: crypto.randomUUID(),
                    name,
                    version: 1,
                    occurredAt: new Date().toISOString(),
                    payload,
                };

                const targets = pubCfg.routes[name] ?? [];

                await Promise.all(
                    targets.map(async (serviceName) => {
                        const q = getQueue(serviceName);

                        // job.name = event name, job.data = envelope
                        await q.add(name, event as any, {
                            jobId: event.id,
                            removeOnComplete: true,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 300 },
                        });
                    }),
                );

                return event;
            },
        };
    }

    function createSubscriber(
        serviceName: string,
        opts?: { concurrency?: number },
    ): EventSubscriber {
        const queueName = serviceName;

        // Внутри Map мы храним "any" — иначе TS не сможет согласовать разные TName в одном контейнере.
        const handlers = new Map<EventName, Array<Handler<any>>>();
        let worker: Worker<EventEnvelope> | null = null;

        return {
            on<TName extends EventName>(name: TName, handler: Handler<TName>) {
                const arr = handlers.get(name) ?? [];
                arr.push(handler as any);
                handlers.set(name, arr);
            },

            async start() {
                if (worker) return;

                worker = new Worker<EventEnvelope>(
                    queueName,
                    async (job: Job<EventEnvelope>) => {
                        const evt = job.data;
                        const hs = handlers.get(job.name as EventName) ?? [];
                        for (const h of hs) await h(evt);
                    },
                    {
                        connection,
                        prefix: bullPrefix,
                        concurrency: opts?.concurrency ?? 10,
                    },
                );

                worker.on('failed', (job, err) => {
                    console.error(`[${serviceName}] failed job`, job?.id, err);
                });
            },

            async stop() {
                await worker?.close();
                worker = null;
            },
        };
    }

    async function closeAll() {
        await Promise.all(Array.from(queues.values()).map((q) => q.close()));
        queues.clear();
    }

    return { createPublisher, createSubscriber, closeAll };
}
