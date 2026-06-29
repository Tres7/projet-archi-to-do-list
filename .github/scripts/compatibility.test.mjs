import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateCompatibility } from './compatibility.mjs';
import { loadYamlFile } from './manifest/io.mjs';

const revision = '0123456789abcdef0123456789abcdef01234567';
const repositoryRoot = path.resolve(new URL('../..', import.meta.url).pathname);

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'compatibility-test-'));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeRepositoryFixtures(repositoryRoot, { includeV2Route = true, includeV2OpenApi = true } = {}) {
  writeFile(
    path.join(repositoryRoot, 'server/apps/auth-service/src/app.ts'),
    [
      "app.use('/auth', authRouter);",
      "app.use('/users', userRouter);",
    ].join('\n'),
  );

  for (const version of ['v1', ...(includeV2OpenApi ? ['v2'] : [])]) {
    writeFile(path.join(repositoryRoot, `server/apps/auth-service/openapi/${version}/auth.yml`), 'openapi: 3.0.3\n');
    writeFile(path.join(repositoryRoot, `server/apps/auth-service/openapi/${version}/users.yml`), 'openapi: 3.0.3\n');
  }

  const routes = [
    "{ path: '/api/auth', target: 'http://auth-service/auth' }",
    "{ path: '/api/users', target: 'http://auth-service/users' }",
    "{ path: '/api/v1/auth', target: 'http://auth-service/v1/auth' }",
    "{ path: '/api/v1/users', target: 'http://auth-service/v1/users' }",
  ];
  if (includeV2Route) {
    routes.push(
      "{ path: '/api/v2/auth', target: 'http://auth-service/v2/auth' }",
      "{ path: '/api/v2/users', target: 'http://auth-service/v2/users' }",
    );
  }

  writeFile(path.join(repositoryRoot, 'server/apps/gateway/routes.ts'), routes.join('\n'));
}

function imageFor(service) {
  const digest = service.padEnd(64, '0').slice(0, 64).replaceAll('-', 'a');
  return `ghcr.io/tres7/projet-archi-to-do-list/${service}@sha256:${digest}`;
}

function writeManifest(repositoryRoot, versions) {
  const services = {};

  for (const service of ['auth-service', 'gateway', 'client']) {
    services[service] = {
      version: versions[service],
      sourceRevision: revision,
      image: imageFor(service),
    };
  }

  const manifestPath = path.join(repositoryRoot, 'deploy/manifests/integration.yaml');
  writeFile(
    manifestPath,
    JSON.stringify({
      schemaVersion: 1,
      manifestVersion: '0.0.1',
      environment: 'integration',
      services,
    }, null, 2),
  );
  return manifestPath;
}

function writeMatrix(repositoryRoot, overrides = {}) {
  const providerV2 = overrides.providerV2 || '>=1.2.0 <2.0.0';
  const gatewayV2 = overrides.gatewayV2 || '>=1.2.0 <2.0.0';
  const clientV2 = overrides.clientV2 || '>=0.1.0 <1.0.0';
  const clientLegacy = overrides.clientLegacy || '>=0.0.0 <0.1.0';

  const matrixPath = path.join(repositoryRoot, 'deploy/compatibility.yaml');
  writeFile(
    matrixPath,
    [
      'schemaVersion: 1',
      '',
      'contracts:',
      '  authApi:',
      '    providers:',
      '      auth-service:',
      `        ">=1.0.0 <1.2.0": [legacy, v1]`,
      `        "${providerV2}": [legacy, v1, v2]`,
      '    gateways:',
      '      gateway:',
      `        ">=1.0.0 <1.2.0": [legacy, v1]`,
      `        "${gatewayV2}": [legacy, v1, v2]`,
      '    consumers:',
      '      client:',
      `        "${clientLegacy}": legacy`,
      `        "${clientV2}": v2`,
    ].join('\n'),
  );
  return matrixPath;
}

function fixture({ versions, matrixOverrides, sanityOptions } = {}) {
  const repositoryRoot = tempDir();
  writeRepositoryFixtures(repositoryRoot, sanityOptions);
  const manifestPath = writeManifest(repositoryRoot, versions || {
    'auth-service': '1.2.1',
    gateway: '1.2.1',
    client: '0.0.5',
  });
  const matrixPath = writeMatrix(repositoryRoot, matrixOverrides);
  return { repositoryRoot, manifestPath, matrixPath };
}

test('accepts a compatible legacy client manifest', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture();

  const result = validateCompatibility({ manifestPath, matrixPath, repositoryRoot });

  assert.equal(result.manifestPath, manifestPath);
});

test('accepts a compatible v2 client manifest', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    versions: {
      'auth-service': '1.2.1',
      gateway: '1.2.1',
      client: '0.1.0',
    },
  });

  assert.doesNotThrow(() => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }));
});

test('rejects a consumer version without a compatibility rule', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    versions: {
      'auth-service': '1.2.1',
      gateway: '1.2.1',
      client: '2.0.0',
    },
  });

  assert.throws(
    () => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }),
    /No compatibility rule found for consumer client 2\.0\.0/,
  );
});

test('rejects a v2 client when the provider only offers legacy and v1', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    versions: {
      'auth-service': '1.1.0',
      gateway: '1.2.1',
      client: '0.1.0',
    },
  });

  assert.throws(
    () => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }),
    /auth-service 1\.1\.0 provides only \[legacy, v1\]/,
  );
});

test('rejects a v2 client when the gateway only exposes legacy and v1', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    versions: {
      'auth-service': '1.2.1',
      gateway: '1.1.0',
      client: '0.1.0',
    },
  });

  assert.throws(
    () => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }),
    /gateway 1\.1\.0 exposes only \[legacy, v1\]/,
  );
});

test('rejects declared v2 provider support when OpenAPI fixtures are missing', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    sanityOptions: { includeV2OpenApi: false },
  });

  assert.throws(
    () => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }),
    /openapi\/v2\/auth\.yml does not exist/,
  );
});

test('rejects declared v2 gateway support when gateway routes are missing', () => {
  const { repositoryRoot, manifestPath, matrixPath } = fixture({
    sanityOptions: { includeV2Route: false },
  });

  assert.throws(
    () => validateCompatibility({ manifestPath, matrixPath, repositoryRoot }),
    /routes\.ts does not contain \/api\/v2\/auth/,
  );
});

test('client build-time API config matches deployment compatibility matrix', () => {
  const matrix = loadYamlFile('deploy/compatibility.yaml', repositoryRoot);
  const apiVersions = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'client/api-versions.json'), 'utf8'),
  );
  const clientCompatibility = Object.fromEntries(
    apiVersions.authApi.clientCompatibility.map(({ client, version }) => [client, version]),
  );

  assert.deepEqual(clientCompatibility, matrix.contracts.authApi.consumers.client);
});
