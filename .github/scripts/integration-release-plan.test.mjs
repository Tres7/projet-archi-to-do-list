import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseSemver } from './semver-utils.mjs';
import { runtimeServices, serviceConfigById } from './services.mjs';
import { writeManifestFile } from './manifest.mjs';
import { validateIntegrationReleasePlan } from './integration-release-plan.mjs';

const repositoryRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const revision = '0123456789abcdef0123456789abcdef01234567';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'integration-release-plan-test-'));
}

function packageVersion(service) {
  const config = serviceConfigById.get(service);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, config.packagePath, 'package.json'), 'utf8'));
  return packageJson.version;
}

function lowerVersion(version) {
  const parsed = parseSemver(version);
  const major = Number(parsed.major);
  const minor = Number(parsed.minor);
  const patch = Number(parsed.patch);

  if (patch > 0) {
    return `${major}.${minor}.${patch - 1}`;
  }
  if (minor > 0) {
    return `${major}.${minor - 1}.0`;
  }
  if (major > 0) {
    return `${major - 1}.0.0`;
  }

  throw new Error(`Cannot create a lower SemVer version for ${version}.`);
}

function imageFor(service, index) {
  return `ghcr.io/tres7/projet-archi-to-do-list/${service}@sha256:${String(index).repeat(64)}`;
}

function writeIntegrationManifest(overrides = {}) {
  const dir = tempDir();
  const manifestPath = path.join(dir, 'integration.yaml');
  const services = {};

  runtimeServices.forEach((service, index) => {
    services[service] = {
      version: service === 'auth-service' ? lowerVersion(packageVersion(service)) : '0.0.0',
      sourceRevision: revision,
      image: imageFor(service, index + 1),
      ...(overrides[service] || {}),
    };
  });

  writeManifestFile(manifestPath, {
    schemaVersion: 1,
    environment: 'integration',
    services,
  }, { repositoryRoot });

  return manifestPath;
}

function matrixFor(service) {
  const config = serviceConfigById.get(service);
  return {
    include: [{
      service,
      packageName: config.packageName,
      packagePath: config.packagePath,
      version: packageVersion(service),
      dockerfile: config.dockerfile,
      context: config.context,
      imageName: config.imageName,
      changelog: config.changelog,
    }],
  };
}

test('integration release plan accepts package versions above the current manifest', () => {
  const manifestPath = writeIntegrationManifest();
  const result = validateIntegrationReleasePlan({
    matrix: matrixFor('auth-service'),
    manifestPath,
    repositoryRoot,
  });

  assert.deepEqual(result.services, ['auth-service']);
});

test('integration release plan rejects versions that are not increased', () => {
  const manifestPath = writeIntegrationManifest({
    'auth-service': {
      version: packageVersion('auth-service'),
    },
  });

  assert.throws(
    () => validateIntegrationReleasePlan({
      matrix: matrixFor('auth-service'),
      manifestPath,
      repositoryRoot,
    }),
    /version was not increased/,
  );
});
