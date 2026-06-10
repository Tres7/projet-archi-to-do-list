type MysqlStartupError = {
    code?: string;
    message?: string;
};

type RetryMysqlStartupOptions = {
    attempts?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_RETRY_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 500;
const TRANSIENT_MYSQL_STARTUP_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
]);

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMysqlStartupError(error: unknown): boolean {
    const mysqlError = error as MysqlStartupError;
    const code = mysqlError?.code;
    const message = mysqlError?.message ?? '';

    return (
        (typeof code === 'string' &&
            TRANSIENT_MYSQL_STARTUP_CODES.has(code)) ||
        message.includes('Connection lost') ||
        message.includes('server closed the connection')
    );
}

export async function retryMysqlStartupQuery<T>(
    query: () => Promise<T>,
    options: RetryMysqlStartupOptions = {},
): Promise<T> {
    const attempts = options.attempts ?? DEFAULT_RETRY_ATTEMPTS;
    const delayMs = options.delayMs ?? DEFAULT_RETRY_DELAY_MS;
    const sleep = options.sleep ?? delay;

    for (let attempt = 1; ; attempt += 1) {
        try {
            return await query();
        } catch (error) {
            if (attempt >= attempts || !isTransientMysqlStartupError(error)) {
                throw error;
            }

            await sleep(delayMs * attempt);
        }
    }
}
