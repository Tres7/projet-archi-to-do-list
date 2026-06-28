import { parseSemver } from '../semver-utils.mjs';
import {
  assertKnownService,
  defaultRoot,
  defaultSchemaPath,
  ghcrDigestPattern,
  gitShaPattern,
  runtimeServices,
  versionedManifestPattern,
} from './config.mjs';
import { Ajv, loadJsonFile, loadYamlFile, orderedManifest, writeYamlFile } from './io.mjs';

export function manifestVersionFromPath(filePath) {
  const match = filePath.split(/[\\/]/).at(-1).match(versionedManifestPattern);
  return match ? match[1] : undefined;
}

export function extractDigest(image) {
  const digestStart = image.lastIndexOf('@');
  return digestStart === -1 ? '' : image.slice(digestStart + 1);
}

function schemaErrors(errors = []) {
  return errors.map((error) => {
    const target = error.instancePath || error.dataPath || error.schemaPath;
    return `${target || '<root>'} ${error.message}`;
  }).join('; ');
}

function expectedEnvironmentFromPath(manifestPath) {
  const baseName = manifestPath.split(/[\\/]/).at(-1);
  if (baseName === 'integration.yaml' || baseName === 'integration.yml') {
    return 'integration';
  }
  if (baseName === 'production.yaml' || baseName === 'production.yml') {
    return 'production';
  }
  return undefined;
}

function assertImmutableImage(image, service) {
  if (typeof image !== 'string') {
    throw new Error(`${service} image must be a string.`);
  }
  if (image.includes(':latest')) {
    throw new Error(`${service} image must not use latest: ${image}`);
  }
  if (!image.includes('@sha256:')) {
    throw new Error(`${service} image must include an immutable @sha256 digest: ${image}`);
  }
  if (!ghcrDigestPattern.test(image)) {
    throw new Error(`${service} image must be a GHCR digest reference: ${image}`);
  }
  if (!image.includes(`/${service}@sha256:`)) {
    throw new Error(`${service} image must end with the matching service name: ${image}`);
  }
}

export function assertServiceEntry(service, entry) {
  assertKnownService(service);

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`${service} entry must be an object.`);
  }
  try {
    parseSemver(entry.version, service);
  } catch {
    throw new Error(`${service} version is not valid SemVer: ${entry.version}`);
  }
  if (!gitShaPattern.test(entry.sourceRevision || '')) {
    throw new Error(`${service} sourceRevision must be a full lowercase Git SHA: ${entry.sourceRevision}`);
  }

  assertImmutableImage(entry.image, service);
}

function validateCustomManifestRules(manifest, manifestPath) {
  if (manifest.schemaVersion !== 1) {
    throw new Error(`schemaVersion must be 1, got ${manifest.schemaVersion}.`);
  }

  const expectedManifestVersion = manifestVersionFromPath(manifestPath);
  if (expectedManifestVersion && manifest.manifestVersion !== expectedManifestVersion) {
    throw new Error(`${manifestPath} must have manifestVersion '${expectedManifestVersion}', got '${manifest.manifestVersion}'.`);
  }

  if (manifest.manifestVersion !== undefined) {
    parseSemver(manifest.manifestVersion, 'manifest');
  }

  const expectedEnvironment = expectedEnvironmentFromPath(manifestPath);
  if (expectedEnvironment && manifest.environment !== expectedEnvironment) {
    throw new Error(`${manifestPath} must have environment '${expectedEnvironment}', got '${manifest.environment}'.`);
  }

  if (!manifest.services || typeof manifest.services !== 'object' || Array.isArray(manifest.services)) {
    throw new Error('manifest services must be an object.');
  }

  for (const service of runtimeServices) {
    if (!Object.hasOwn(manifest.services, service)) {
      throw new Error(`manifest is missing required service '${service}'.`);
    }
    assertServiceEntry(service, manifest.services[service]);
  }

  for (const service of Object.keys(manifest.services)) {
    assertKnownService(service);
  }
}

export function validateManifestObject(manifest, manifestPath, { repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath } = {}) {
  validateCustomManifestRules(manifest, manifestPath);

  const schema = loadJsonFile(schemaPath, repositoryRoot);
  const ajv = new Ajv({ allErrors: true, schemaId: 'auto' });
  const validate = ajv.compile(schema);

  if (!validate(manifest)) {
    throw new Error(`Manifest schema validation failed: ${schemaErrors(validate.errors)}`);
  }

  return true;
}

export function validateManifestFile(manifestPath, options = {}) {
  const manifest = loadYamlFile(manifestPath, options.repositoryRoot || defaultRoot);
  validateManifestObject(manifest, manifestPath, options);
  return manifest;
}

export function writeManifestFile(manifestPath, manifest, { repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath } = {}) {
  validateManifestObject(manifest, manifestPath, { repositoryRoot, schemaPath });
  writeYamlFile(manifestPath, orderedManifest(manifest), repositoryRoot);
}
