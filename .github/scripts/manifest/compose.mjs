import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { composeEnvNames, deepClone, defaultRoot, defaultSchemaPath, runtimeServices } from './config.mjs';
import { loadYamlFile, resolvePath, writeGithubOutput, yaml } from './io.mjs';
import { validateManifestFile } from './validate.mjs';

export function renderComposeEnv({ manifestPath, outputPath, repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath }) {
  if (!manifestPath || !outputPath) {
    throw new Error('render-compose-env requires --manifest <path> --output <file>.');
  }

  const manifest = validateManifestFile(manifestPath, { repositoryRoot, schemaPath });
  const lines = runtimeServices.map((service) => {
    const envName = composeEnvNames.get(service);
    return `${envName}=${manifest.services[service].image}`;
  });

  fs.writeFileSync(resolvePath(outputPath, repositoryRoot), `${lines.join('\n')}\n`);
  return lines;
}

export function renderComposeFile({
  manifestPath,
  outputPath,
  templatePath = 'compose.prod.yml',
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!manifestPath || !outputPath) {
    throw new Error('render-compose requires --manifest <path> --output <file>.');
  }

  const manifest = validateManifestFile(manifestPath, { repositoryRoot, schemaPath });
  const candidate = deepClone(loadYamlFile(templatePath, repositoryRoot));

  if (!candidate.services || typeof candidate.services !== 'object' || Array.isArray(candidate.services)) {
    throw new Error(`${templatePath} must contain a services object.`);
  }

  for (const service of runtimeServices) {
    if (!candidate.services[service]) {
      throw new Error(`${templatePath} is missing service '${service}'.`);
    }

    candidate.services[service].image = manifest.services[service].image;

    const migrateService = `${service}-migrate`;
    if (candidate.services[migrateService]) {
      candidate.services[migrateService].image = manifest.services[service].image;
    }
  }

  if (candidate.volumes && typeof candidate.volumes === 'object' && !Array.isArray(candidate.volumes)) {
    for (const [volumeName, volumeConfig] of Object.entries(candidate.volumes)) {
      if (volumeConfig === null) {
        candidate.volumes[volumeName] = {};
      }
    }
  }

  const content = yaml.dump(candidate, { lineWidth: -1, noRefs: true, sortKeys: false });
  fs.mkdirSync(path.dirname(resolvePath(outputPath, repositoryRoot)), { recursive: true });
  fs.writeFileSync(resolvePath(outputPath, repositoryRoot), content);
  return candidate;
}

export function verifyComposeFile({
  manifestPath,
  composePath,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!manifestPath || !composePath) {
    throw new Error('verify-compose requires --manifest <path> --compose <file>.');
  }

  const manifest = validateManifestFile(manifestPath, { repositoryRoot, schemaPath });
  const compose = loadYamlFile(composePath, repositoryRoot);

  if (!compose.services || typeof compose.services !== 'object' || Array.isArray(compose.services)) {
    throw new Error(`${composePath} must contain a services object.`);
  }

  for (const service of runtimeServices) {
    const composeService = compose.services[service];
    if (!composeService || typeof composeService !== 'object' || Array.isArray(composeService)) {
      throw new Error(`${composePath} is missing service '${service}'.`);
    }

    if (composeService.image !== manifest.services[service].image) {
      throw new Error(`${composePath} image for ${service} does not match ${manifestPath}.`);
    }

    const migrateService = `${service}-migrate`;
    const composeMigrateService = compose.services[migrateService];
    if (composeMigrateService && composeMigrateService.image !== manifest.services[service].image) {
      throw new Error(`${composePath} image for ${migrateService} does not match ${manifestPath}.`);
    }
  }

  return true;
}

export function validateComposeConfig({ manifestPath, outputPath, repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath }) {
  renderComposeEnv({ manifestPath, outputPath, repositoryRoot, schemaPath });

  execFileSync('docker', [
    'compose',
    '--env-file',
    resolvePath(outputPath, repositoryRoot),
    '-f',
    resolvePath('compose.prod.yml', repositoryRoot),
    'config',
    '--quiet',
  ], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
}

export function listImages({ manifestPath, githubOutput, repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath }) {
  if (!manifestPath) {
    throw new Error('list-images requires --manifest <path>.');
  }

  const manifest = validateManifestFile(manifestPath, { repositoryRoot, schemaPath });
  const images = runtimeServices.map((service) => ({
    service,
    version: manifest.services[service].version,
    sourceRevision: manifest.services[service].sourceRevision,
    image: manifest.services[service].image,
  }));

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      count: String(images.length),
      matrix: JSON.stringify({ include: images }),
    });
  }

  return images;
}
