import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { defaultRoot, runtimeServices } from './config.mjs';

const require = createRequire(import.meta.url);
export const yaml = require('../../../server/node_modules/js-yaml');
export const Ajv = require('../../../server/node_modules/ajv');

export function resolvePath(filePath, repositoryRoot = defaultRoot) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repositoryRoot, filePath);
}

export function loadYamlFile(filePath, repositoryRoot = defaultRoot) {
  const absolutePath = resolvePath(filePath, repositoryRoot);
  let content;

  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${filePath}: ${error.message}`);
  }

  try {
    const document = yaml.load(content);
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new Error('manifest must be a YAML object');
    }
    return document;
  } catch (error) {
    throw new Error(`Cannot parse YAML ${filePath}: ${error.message}`);
  }
}

export function loadJsonFile(filePath, repositoryRoot = defaultRoot) {
  const absolutePath = resolvePath(filePath, repositoryRoot);

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse JSON ${filePath}: ${error.message}`);
  }
}

export function orderedManifest(manifest) {
  const ordered = {
    schemaVersion: manifest.schemaVersion,
    ...(manifest.manifestVersion ? { manifestVersion: manifest.manifestVersion } : {}),
    ...(manifest.environment ? { environment: manifest.environment } : {}),
    services: {},
  };

  for (const service of runtimeServices) {
    const entry = manifest.services[service];
    ordered.services[service] = {
      version: entry.version,
      sourceRevision: entry.sourceRevision,
      image: entry.image,
    };
  }

  return ordered;
}

export function writeYamlFile(filePath, document, repositoryRoot = defaultRoot) {
  const absolutePath = resolvePath(filePath, repositoryRoot);
  const content = yaml.dump(document, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

export function writeGithubOutput(filePath, output) {
  const lines = [];
  for (const [key, value] of Object.entries(output)) {
    if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${key}<<EOF`, value, 'EOF');
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  fs.appendFileSync(filePath, `${lines.join('\n')}\n`);
}

export function writeOptionalSummary(filePath, summary, repositoryRoot = defaultRoot) {
  if (filePath) {
    fs.writeFileSync(resolvePath(filePath, repositoryRoot), summary);
  }
}
