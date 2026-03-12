import type { RunningProjectApp } from './types.ts';

export async function bootstrapProjectApp(): Promise<RunningProjectApp> {
    const { persistence } =
        await import('../../../apps/project-service/src/infrastructure/persistence/index.ts');
    const { createApp } =
        await import('../../../apps/project-service/src/app.ts');

    await persistence.connection.init();

    const { app, startModules, stopModules } = createApp(persistence);
    await startModules();

    const closeConnection = async () => {
        const connection = persistence.connection as any;

        try {
            if (typeof connection.close === 'function') {
                await connection.close();
            }
        } catch {}

        try {
            if (typeof connection.end === 'function') {
                await connection.end();
            }
        } catch {}

        try {
            if (typeof connection.destroy === 'function') {
                await connection.destroy();
            }
        } catch {}

        try {
            if (connection.pool && typeof connection.pool.end === 'function') {
                await connection.pool.end();
            }
        } catch {}

        try {
            if (
                connection.connection &&
                typeof connection.connection.end === 'function'
            ) {
                await connection.connection.end();
            }
        } catch {}
    };

    return {
        app,
        stopModules,
        closeConnection,
    };
}
