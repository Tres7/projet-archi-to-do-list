import type { DriverFactory } from './DriverFactory.ts';
import type { PersistenceContainer, PersistenceDriver } from './types.ts';

async function importFactory(
    driver: PersistenceDriver,
): Promise<DriverFactory> {
    try {
        const mod = await import(`./${driver}/factory.ts`);
        return mod.default as DriverFactory;
    } catch (_) {
        throw new Error(
            `Cannot load persistence driver "${driver}". ` +
                `Expected module "./${driver}/factory.ts".`,
        );
    }
}

export class PersistenceFactory {
    static async create(
        driver: PersistenceDriver,
        env: NodeJS.ProcessEnv = process.env,
    ): Promise<PersistenceContainer> {
        const factory = await importFactory(driver);
        return factory.create(env);
    }
}
