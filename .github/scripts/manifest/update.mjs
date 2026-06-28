import fs from 'node:fs';
import path from 'node:path';
import { compareSemver, parseSemver } from '../semver-utils.mjs';
import {
  assertKnownService,
  deepClone,
  defaultRoot,
  defaultSchemaPath,
  runtimeServices,
  sameJson,
  versionedManifestPattern,
} from './config.mjs';
import { resolvePath, writeGithubOutput, writeOptionalSummary } from './io.mjs';
import { entriesFromMetadataDir } from './metadata.mjs';
import { changesForServices, markdownSummary } from './summary.mjs';
import { manifestVersionFromPath, validateManifestFile, validateManifestObject, writeManifestFile } from './validate.mjs';

function incrementPatchVersion(version) {
  const parsed = parseSemver(version);
  return `${parsed.major}.${parsed.minor}.${Number(parsed.patch) + 1}`;
}

export function updateManifest({
  manifestPath,
  updates,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!manifestPath) {
    throw new Error('update requires --manifest <path>.');
  }

  const manifest = validateManifestFile(manifestPath, { repositoryRoot, schemaPath });
  const candidate = deepClone(manifest);
  const updatedServices = updates.map((update) => update.service);

  for (const { service, entry } of updates) {
    candidate.services[service] = { ...entry };
  }

  validateManifestObject(candidate, manifestPath, { repositoryRoot, schemaPath });

  const unchangedServices = runtimeServices.filter((service) => !updatedServices.includes(service));
  for (const service of unchangedServices) {
    if (!sameJson(manifest.services[service], candidate.services[service])) {
      throw new Error(`${service} changed during update but was not requested.`);
    }
  }

  const changes = changesForServices(manifest, candidate, updatedServices);
  const changedCount = changes.filter((change) => change.changed).length;
  const summary = markdownSummary('Integration manifest update', changes, unchangedServices);

  if (changedCount > 0) {
    writeManifestFile(manifestPath, candidate, { repositoryRoot, schemaPath });
  }

  writeOptionalSummary(summaryFile, summary, repositoryRoot);

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      changed_count: String(changedCount),
      services: updatedServices.join(','),
    });
  }

  return { changedCount, changes, summary };
}

export function versionedManifestFiles({ manifestDir = 'deploy/manifests', repositoryRoot = defaultRoot } = {}) {
  const absoluteDir = resolvePath(manifestDir, repositoryRoot);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs.readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && versionedManifestPattern.test(entry.name))
    .map((entry) => {
      const manifestPath = path.join(manifestDir, entry.name).replaceAll(path.sep, '/');
      const version = manifestVersionFromPath(entry.name);
      parseSemver(version, entry.name);
      return { manifestPath, version };
    })
    .sort((left, right) => compareSemver(parseSemver(left.version), parseSemver(right.version)));
}

export function latestManifest({
  manifestDir = 'deploy/manifests',
  version,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
} = {}) {
  const manifests = versionedManifestFiles({ manifestDir, repositoryRoot });
  let selected;

  if (version) {
    selected = manifests.find((manifest) => manifest.version === version);
    if (!selected) {
      throw new Error(`No deployment manifest found for version '${version}' in ${manifestDir}.`);
    }
  } else {
    selected = manifests.at(-1);
    if (!selected) {
      throw new Error(`No versioned deployment manifests found in ${manifestDir}.`);
    }
  }

  const manifest = validateManifestFile(selected.manifestPath, { repositoryRoot, schemaPath });
  const manifestVersion = manifest.manifestVersion || selected.version;
  if (manifestVersion !== selected.version) {
    throw new Error(`${selected.manifestPath} manifestVersion '${manifestVersion}' does not match its file name.`);
  }

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      manifest_path: selected.manifestPath,
      manifest_version: selected.version,
    });
  }

  return selected;
}

export function createVersionedManifest({
  metadataDir,
  manifestDir = 'deploy/manifests',
  baseManifestPath,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!metadataDir) {
    throw new Error('create-version requires --metadata-dir <dir>.');
  }

  const existing = versionedManifestFiles({ manifestDir, repositoryRoot });
  const latest = existing.at(-1);
  const basePath = baseManifestPath || latest?.manifestPath || 'deploy/manifests/integration.yaml';
  const base = validateManifestFile(basePath, { repositoryRoot, schemaPath });
  const updates = entriesFromMetadataDir(metadataDir, repositoryRoot);
  const candidate = deepClone(base);
  const updatedServices = updates.map((update) => update.service);
  const nextVersion = incrementPatchVersion(latest?.version || base.manifestVersion || '0.0.0');

  candidate.manifestVersion = nextVersion;
  delete candidate.environment;

  for (const { service, entry } of updates) {
    candidate.services[service] = { ...entry };
  }

  const outputPath = path.join(manifestDir, `manifest-${nextVersion}.yaml`).replaceAll(path.sep, '/');
  if (fs.existsSync(resolvePath(outputPath, repositoryRoot))) {
    throw new Error(`Versioned manifest already exists: ${outputPath}`);
  }

  validateManifestObject(candidate, outputPath, { repositoryRoot, schemaPath });

  const unchangedServices = runtimeServices.filter((service) => !updatedServices.includes(service));
  const changes = changesForServices(base, candidate, updatedServices);
  const summary = markdownSummary(`Deployment manifest ${nextVersion}`, changes, unchangedServices);

  fs.mkdirSync(resolvePath(manifestDir, repositoryRoot), { recursive: true });
  writeManifestFile(outputPath, candidate, { repositoryRoot, schemaPath });
  writeOptionalSummary(summaryFile, summary, repositoryRoot);

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      changed_count: '1',
      manifest_path: outputPath,
      manifest_version: nextVersion,
      services: updatedServices.join(','),
    });
  }

  return { changedCount: 1, manifestPath: outputPath, manifestVersion: nextVersion, changes, summary };
}
