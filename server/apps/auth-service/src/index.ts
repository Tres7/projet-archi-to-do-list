import 'dotenv/config';
import { createApp } from './app.ts';
import { persistence } from './infrastructure/persistence/index.ts';

const PORT = Number(process.env.PORT ?? 3002);

async function bootstrap() {
    const { connection } = persistence;

    await connection.init();

    const { app } = createApp(persistence);

    const server = app.listen(PORT, () => {
        console.log(`auth app listening on port ${PORT}`);
    });

    async function shutdown(signal: string) {
        console.log(`Received ${signal}, shutting down...`);
        server.close(async () => {
            process.exit(0);
        });
    }

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
