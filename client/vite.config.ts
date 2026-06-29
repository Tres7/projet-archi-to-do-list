import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

type ApiVersion = 'legacy' | 'v1' | 'v2';

interface ApiVersionsConfig {
    authApi: {
        clientCompatibility: Array<{ client: string; version: ApiVersion }>;
    };
}

function parseVersion(version: string): [number, number, number] {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!match) {
        throw new Error(`Invalid client package version '${version}'.`);
    }

    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left: string, right: string): number {
    const leftParts = parseVersion(left);
    const rightParts = parseVersion(right);

    for (let index = 0; index < leftParts.length; index += 1) {
        const diff = leftParts[index] - rightParts[index];
        if (diff !== 0) {
            return diff;
        }
    }

    return 0;
}

function satisfiesComparator(version: string, comparator: string): boolean {
    const match = comparator.match(/^(>=|>|<=|<|=)?(.+)$/);
    if (!match) {
        throw new Error(`Invalid API compatibility comparator '${comparator}'.`);
    }

    const operator = match[1] || '=';
    const target = match[2];
    const compared = compareVersions(version, target);

    switch (operator) {
        case '>':
            return compared > 0;
        case '>=':
            return compared >= 0;
        case '<':
            return compared < 0;
        case '<=':
            return compared <= 0;
        case '=':
            return compared === 0;
        default:
            throw new Error(`Unsupported API compatibility operator '${operator}'.`);
    }
}

function resolveAuthApiVersion(
    clientVersion: string,
    apiVersions: ApiVersionsConfig,
): ApiVersion {
    const match = apiVersions.authApi.clientCompatibility.find(({ client }) => (
        client.split(/\s+/).every((comparator) => (
            comparator.length > 0 && satisfiesComparator(clientVersion, comparator)
        ))
    ));

    if (!match) {
        throw new Error(`No auth API version is configured for client ${clientVersion}.`);
    }

    return match.version;
}

const packageJson = JSON.parse(
    fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };
const apiVersions = JSON.parse(
    fs.readFileSync(new URL('./api-versions.json', import.meta.url), 'utf8'),
) as ApiVersionsConfig;
const apiConfig = {
    authApiVersion: resolveAuthApiVersion(packageJson.version, apiVersions),
};

const gatewayTarget = 'http://localhost:3000';
const proxyTargets = [
    '/api/v1',
    '/api/v2',
    '/api/projects',
    '/api/auth',
    '/api/users',
    '/api/notifications',
];

export default defineConfig({
    plugins: [react()],
    define: {
        __API_CONFIG__: JSON.stringify(apiConfig),
    },
    server: {
        proxy: Object.fromEntries(
            proxyTargets.map((prefix) => [
                prefix,
                {
                    target: gatewayTarget,
                    changeOrigin: true,
                },
            ]),
        ),
    },
});
