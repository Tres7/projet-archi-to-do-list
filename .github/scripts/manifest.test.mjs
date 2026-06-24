import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  listImages,
  promoteService,
  promoteServices,
  renderComposeFile,
  renderComposeEnv,
  runtimeServices,
  verifyComposeFile,
  updateManifest,
  validateManifestFile,
  writeManifestFile,
} from './manifest.mjs';

const repositoryRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const revision = '0123456789abcdef0123456789abcdef01234567';

const digestByService = new Map([
  ['auth-service', 'a'.repeat(64)],
  ['project-service', 'b'.repeat(64)],
  ['task-service', 'c'.repeat(64)],
  ['notification-service', 'd'.repeat(64)],
  ['gateway', 'e'.repeat(64)],
  ['client', 'f'.repeat(64)],
]);

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
}

function imageFor(service, digest = digestByService.get(service)) {
  return `ghcr.io/tres7/projet-archi-to-do-list/${service}@sha256:${digest}`;
}

function manifest(environment = 'integration', overrides = {}) {
  const services = {};

  for (const service of runtimeServices) {
    services[service] = {
      version: service === 'client' ? '0.0.0' : '1.0.0',
      sourceRevision: revision,
      image: imageFor(service),
      ...(overrides[service] || {}),
    };
  }

  return {
    schemaVersion: 1,
    environment,
    services,
  };
}

function writeFixture(dir, environment = 'integration', overrides = {}) {
  const fileName = `${environment}.yaml`;
  const filePath = path.join(dir, fileName);
  writeManifestFile(filePath, manifest(environment, overrides), { repositoryRoot });
  return filePath;
}

function readManifest(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content;
}

test('validates a valid integration manifest', () => {
  const dir = tempDir();
  const filePath = writeFixture(dir, 'integration');

  const result = validateManifestFile(filePath, { repositoryRoot });

  assert.equal(result.environment, 'integration');
});

test('validates a valid production manifest', () => {
  const dir = tempDir();
  const filePath = writeFixture(dir, 'production');

  const result = validateManifestFile(filePath, { repositoryRoot });

  assert.equal(result.environment, 'production');
});

test('rejects a manifest missing a required service', () => {
  const dir = tempDir();
  const filePath = path.join(dir, 'integration.yaml');
  const data = manifest('integration');
  delete data.services.gateway;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  assert.throws(
    () => validateManifestFile(filePath, { repositoryRoot }),
    /missing required service 'gateway'/,
  );
});

test('rejects invalid SemVer', () => {
  const dir = tempDir();
  const filePath = path.join(dir, 'integration.yaml');
  fs.writeFileSync(
    filePath,
    JSON.stringify(manifest('integration', { 'auth-service': { version: '1.02.0' } }), null, 2),
  );

  assert.throws(
    () => validateManifestFile(filePath, { repositoryRoot }),
    /not valid SemVer/,
  );
});

test('rejects image refs without digests', () => {
  const dir = tempDir();
  const filePath = path.join(dir, 'integration.yaml');
  fs.writeFileSync(
    filePath,
    JSON.stringify(manifest('integration', { 'auth-service': { image: 'ghcr.io/tres7/projet-archi-to-do-list/auth-service:1.0.0' } }), null, 2),
  );

  assert.throws(
    () => validateManifestFile(filePath, { repositoryRoot }),
    /must include an immutable @sha256 digest/,
  );
});

test('rejects latest image refs', () => {
  const dir = tempDir();
  const filePath = path.join(dir, 'integration.yaml');
  fs.writeFileSync(
    filePath,
    JSON.stringify(manifest('integration', { 'auth-service': { image: 'ghcr.io/tres7/projet-archi-to-do-list/auth-service:latest' } }), null, 2),
  );

  assert.throws(
    () => validateManifestFile(filePath, { repositoryRoot }),
    /must not use latest/,
  );
});

test('updates one service entry', () => {
  const dir = tempDir();
  const filePath = writeFixture(dir, 'integration');
  const newImage = imageFor('auth-service', '1111111111111111111111111111111111111111111111111111111111111111');

  const result = updateManifest({
    manifestPath: filePath,
    updates: [{
      service: 'auth-service',
      entry: {
        version: '1.1.0',
        sourceRevision: revision,
        image: newImage,
      },
    }],
    repositoryRoot,
  });
  const updated = validateManifestFile(filePath, { repositoryRoot });

  assert.equal(result.changedCount, 1);
  assert.equal(updated.services['auth-service'].version, '1.1.0');
  assert.equal(updated.services['auth-service'].image, newImage);
});

test('update leaves all other services unchanged', () => {
  const dir = tempDir();
  const filePath = writeFixture(dir, 'integration');
  const before = validateManifestFile(filePath, { repositoryRoot });

  updateManifest({
    manifestPath: filePath,
    updates: [{
      service: 'task-service',
      entry: {
        version: '1.2.0',
        sourceRevision: revision,
        image: imageFor('task-service', '2222222222222222222222222222222222222222222222222222222222222222'),
      },
    }],
    repositoryRoot,
  });
  const after = validateManifestFile(filePath, { repositoryRoot });

  for (const service of runtimeServices.filter((candidate) => candidate !== 'task-service')) {
    assert.deepEqual(after.services[service], before.services[service]);
  }
});

test('promotion copies the exact integration entry', () => {
  const dir = tempDir();
  const integrationPath = writeFixture(dir, 'integration', {
    gateway: {
      version: '1.3.0',
      image: imageFor('gateway', '3333333333333333333333333333333333333333333333333333333333333333'),
    },
  });
  const productionPath = writeFixture(dir, 'production');

  const result = promoteService({
    service: 'gateway',
    fromPath: integrationPath,
    toPath: productionPath,
    repositoryRoot,
  });
  const integration = validateManifestFile(integrationPath, { repositoryRoot });
  const production = validateManifestFile(productionPath, { repositoryRoot });

  assert.equal(result.changedCount, 1);
  assert.deepEqual(production.services.gateway, integration.services.gateway);
});

test('promotion can copy all integration entries', () => {
  const dir = tempDir();
  const integrationPath = writeFixture(dir, 'integration', {
    gateway: {
      version: '1.3.0',
      image: imageFor('gateway', '3333333333333333333333333333333333333333333333333333333333333333'),
    },
    client: {
      version: '0.1.0',
      image: imageFor('client', '4444444444444444444444444444444444444444444444444444444444444444'),
    },
  });
  const productionPath = writeFixture(dir, 'production');

  const result = promoteServices({
    services: runtimeServices,
    fromPath: integrationPath,
    toPath: productionPath,
    repositoryRoot,
  });
  const integration = validateManifestFile(integrationPath, { repositoryRoot });
  const production = validateManifestFile(productionPath, { repositoryRoot });

  assert.equal(result.changedCount, 2);
  assert.deepEqual(production.services, integration.services);
});

test('promotion rejects unknown services', () => {
  const dir = tempDir();
  const integrationPath = writeFixture(dir, 'integration');
  const productionPath = writeFixture(dir, 'production');

  assert.throws(
    () => promoteService({
      service: 'unknown-service',
      fromPath: integrationPath,
      toPath: productionPath,
      repositoryRoot,
    }),
    /Unknown service/,
  );
});

test('render-compose writes pinned service images from manifest', () => {
  const dir = tempDir();
  const manifestPath = writeFixture(dir, 'production', {
    'auth-service': {
      image: imageFor('auth-service', '9999999999999999999999999999999999999999999999999999999999999999'),
    },
  });
  const outputPath = path.join(dir, 'compose.production.yml');

  renderComposeFile({ manifestPath, outputPath, repositoryRoot });
  const rendered = readManifest(outputPath);

  assert.match(
    rendered,
    /image: ghcr\.io\/tres7\/projet-archi-to-do-list\/auth-service@sha256:9999999999999999999999999999999999999999999999999999999999999999/,
  );
  assert.equal(rendered.includes('${AUTH_SERVICE_IMAGE'), false);
  assert.equal(verifyComposeFile({ manifestPath, composePath: outputPath, repositoryRoot }), true);
});

test('render-compose-env writes all service image variables', () => {
  const dir = tempDir();
  const manifestPath = writeFixture(dir, 'integration');
  const outputPath = path.join(dir, 'images.env');

  renderComposeEnv({ manifestPath, outputPath, repositoryRoot });
  const envFile = readManifest(outputPath);

  assert.match(envFile, /^AUTH_SERVICE_IMAGE=ghcr\.io\/tres7\/projet-archi-to-do-list\/auth-service@sha256:/m);
  assert.match(envFile, /^PROJECT_SERVICE_IMAGE=/m);
  assert.match(envFile, /^TASK_SERVICE_IMAGE=/m);
  assert.match(envFile, /^NOTIFICATION_SERVICE_IMAGE=/m);
  assert.match(envFile, /^GATEWAY_IMAGE=/m);
  assert.match(envFile, /^CLIENT_IMAGE=/m);
});

test('list-images returns production digest refs', () => {
  const dir = tempDir();
  const manifestPath = writeFixture(dir, 'production');

  const images = listImages({ manifestPath, repositoryRoot });

  assert.equal(images.length, runtimeServices.length);
  assert.deepEqual(images.map((item) => item.service), runtimeServices);
  for (const item of images) {
    assert.match(item.image, /@sha256:[0-9a-f]{64}$/);
  }
});
