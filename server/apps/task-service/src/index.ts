import 'dotenv/config';
import { createApp } from './app.ts';
import { persistence } from './infrastructure/persistence/index.ts';

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
    const { connection } = persistence;

    await connection.init();

    const { app, startModules, stopModules } = createApp(persistence);
    await startModules();

    const server = app.listen(PORT, () => {
        console.log(`Task app listening on port ${PORT}`);
    });

    async function shutdown(signal: string) {
        console.log(`Received ${signal}, shutting down...`);
        server.close(async () => {
            await stopModules();
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
