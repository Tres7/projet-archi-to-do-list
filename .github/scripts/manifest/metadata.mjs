import fs from 'node:fs';
import path from 'node:path';
import { digestPattern, defaultRoot, runtimeServices } from './config.mjs';
import { loadJsonFile, resolvePath } from './io.mjs';
import { assertServiceEntry, extractDigest } from './validate.mjs';
import { assertKnownService } from './config.mjs';

export function entryFromOptions(options) {
  const { service, version, revision, image } = options;
  if (!service || !version || !revision || !image) {
    throw new Error('update requires --service, --version, --revision, and --image unless --metadata-dir is provided.');
  }
  assertKnownService(service);
  const entry = { version, sourceRevision: revision, image };
  assertServiceEntry(service, entry);
  return [{ service, entry }];
}

function findJsonFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function metadataToEntry(metadata, filePath) {
  const service = metadata.service;
  assertKnownService(service);

  const entry = {
    version: metadata.version,
    sourceRevision: metadata.sourceRevision,
    image: metadata.image,
  };

  assertServiceEntry(service, entry);

  if (metadata.digest !== undefined) {
    if (!digestPattern.test(metadata.digest)) {
      throw new Error(`${filePath} digest must be sha256:<64 hex chars>.`);
    }
    if (extractDigest(entry.image) !== metadata.digest) {
      throw new Error(`${filePath} digest does not match image digest.`);
    }
  }

  return { service, entry };
}

export function entriesFromMetadataDir(metadataDir, repositoryRoot = defaultRoot) {
  const absoluteDir = resolvePath(metadataDir, repositoryRoot);
  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Metadata directory does not exist: ${metadataDir}`);
  }

  const files = findJsonFiles(absoluteDir);
  if (files.length === 0) {
    throw new Error(`No metadata JSON files found in ${metadataDir}.`);
  }

  const seen = new Set();
  return files.map((filePath) => {
    const metadata = loadJsonFile(filePath, repositoryRoot);
    const update = metadataToEntry(metadata, filePath);
    if (seen.has(update.service)) {
      throw new Error(`Duplicate release metadata for ${update.service}.`);
    }
    seen.add(update.service);
    return update;
  }).sort((left, right) => runtimeServices.indexOf(left.service) - runtimeServices.indexOf(right.service));
}
