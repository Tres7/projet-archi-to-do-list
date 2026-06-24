import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseSemver } from './semver-utils.mjs';
import { runtimeServices } from './services.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || path.resolve(path.dirname(scriptPath), '../..');
const defaultSchemaPath = 'deploy/manifests/schema.json';
const require = createRequire(import.meta.url);
const yaml = require('../../server/node_modules/js-yaml');
const Ajv = require('../../server/node_modules/ajv');

export { runtimeServices };

const composeEnvNames = new Map([
  ['auth-service', 'AUTH_SERVICE_IMAGE'],
  ['project-service', 'PROJECT_SERVICE_IMAGE'],
  ['task-service', 'TASK_SERVICE_IMAGE'],
  ['notification-service', 'NOTIFICATION_SERVICE_IMAGE'],
  ['gateway', 'GATEWAY_IMAGE'],
  ['client', 'CLIENT_IMAGE'],
]);

const gitShaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const ghcrDigestPattern = /^ghcr\.io\/[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*@sha256:[0-9a-f]{64}$/;

function resolvePath(filePath, repositoryRoot = defaultRoot) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repositoryRoot, filePath);
}

function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split('=', 2);
    if (rawValue !== undefined) {
      options[rawKey] = rawValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[rawKey] = 'true';
      continue;
    }

    options[rawKey] = next;
    index += 1;
  }

  return { options, positional };
}

function usage() {
  return `Usage:
  node .github/scripts/manifest.mjs validate <manifest>
  node .github/scripts/manifest.mjs update --manifest <path> --service <service> --version <semver> --revision <sha> --image <ghcr-ref>
  node .github/scripts/manifest.mjs update --manifest <path> --metadata-dir <dir> [--summary-file <path>] [--github-output <path>]
  node .github/scripts/manifest.mjs promote --service <service|all> --from <integration.yaml> --to <production.yaml> [--summary-file <path>] [--github-output <path>]
  node .github/scripts/manifest.mjs render-compose-env --manifest <path> --output <file>
  node .github/scripts/manifest.mjs render-compose --manifest <path> --output <file> [--template <compose.prod.yml>]
  node .github/scripts/manifest.mjs verify-compose --manifest <path> --compose <file>
  node .github/scripts/manifest.mjs validate-compose --manifest <path> --output <file>
  node .github/scripts/manifest.mjs list-images --manifest <path> [--github-output <path>]

Manifests must use schemaVersion 1, contain all runtime services, and pin GHCR images with @sha256 digests.`;
}

function assertKnownService(service) {
  if (!runtimeServices.includes(service)) {
    throw new Error(`Unknown service '${service}'. Expected one of: ${runtimeServices.join(', ')}.`);
  }
}

function deepClone(value) {
  return structuredClone(value);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function loadYamlFile(filePath, repositoryRoot = defaultRoot) {
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

function loadJsonFile(filePath, repositoryRoot = defaultRoot) {
  const absolutePath = resolvePath(filePath, repositoryRoot);

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse JSON ${filePath}: ${error.message}`);
  }
}

function loadSchema(repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath) {
  return loadJsonFile(schemaPath, repositoryRoot);
}

function schemaErrors(errors = []) {
  return errors.map((error) => {
    const target = error.instancePath || error.dataPath || error.schemaPath;
    return `${target || '<root>'} ${error.message}`;
  }).join('; ');
}

function expectedEnvironmentFromPath(manifestPath) {
  const baseName = path.basename(manifestPath);
  if (baseName === 'integration.yaml' || baseName === 'integration.yml') {
    return 'integration';
  }
  if (baseName === 'production.yaml' || baseName === 'production.yml') {
    return 'production';
  }
  return undefined;
}

function extractDigest(image) {
  const digestStart = image.lastIndexOf('@');
  return digestStart === -1 ? '' : image.slice(digestStart + 1);
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

function assertServiceEntry(service, entry) {
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

  const schema = loadSchema(repositoryRoot, schemaPath);
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

function orderedManifest(manifest) {
  const ordered = {
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
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

export function writeManifestFile(manifestPath, manifest, { repositoryRoot = defaultRoot, schemaPath = defaultSchemaPath } = {}) {
  validateManifestObject(manifest, manifestPath, { repositoryRoot, schemaPath });
  const absolutePath = resolvePath(manifestPath, repositoryRoot);
  const content = yaml.dump(orderedManifest(manifest), {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(absolutePath, content);
}

function entryFromOptions(options) {
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

function entriesFromMetadataDir(metadataDir, repositoryRoot = defaultRoot) {
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

function changesForServices(before, after, services) {
  return services.map((service) => ({
    service,
    oldVersion: before.services[service].version,
    newVersion: after.services[service].version,
    oldDigest: extractDigest(before.services[service].image),
    newDigest: extractDigest(after.services[service].image),
    changed: !sameJson(before.services[service], after.services[service]),
  }));
}

function markdownSummary(title, changes, unchangedServices = []) {
  const lines = [
    `## ${title}`,
    '',
    '| service | old version | new version | old image digest | new image digest |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const change of changes) {
    lines.push(`| ${change.service} | ${change.oldVersion} | ${change.newVersion} | \`${change.oldDigest}\` | \`${change.newDigest}\` |`);
  }

  if (changes.length === 0) {
    lines.push('| none | - | - | - | - |');
  }

  if (unchangedServices.length > 0) {
    lines.push('', `Unchanged services verified: ${unchangedServices.join(', ')}.`);
  }

  return `${lines.join('\n')}\n`;
}

function writeGithubOutput(filePath, output) {
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

function writeOptionalSummary(filePath, summary, repositoryRoot = defaultRoot) {
  if (filePath) {
    fs.writeFileSync(resolvePath(filePath, repositoryRoot), summary);
  }
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

export function promoteService({
  service,
  fromPath,
  toPath,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  const result = promoteServices({
    services: [service],
    fromPath,
    toPath,
    summaryFile,
    githubOutput,
    repositoryRoot,
    schemaPath,
  });

  return {
    changedCount: result.changedCount,
    changes: result.changes,
    summary: result.summary,
  };
}

export function promoteServices({
  services,
  fromPath,
  toPath,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('promote requires at least one service.');
  }

  const selectedServices = [...new Set(services)];
  for (const service of selectedServices) {
    assertKnownService(service);
  }

  if (!fromPath || !toPath) {
    throw new Error('promote requires --service <service> --from <integration.yaml> --to <production.yaml>.');
  }

  const from = validateManifestFile(fromPath, { repositoryRoot, schemaPath });
  const to = validateManifestFile(toPath, { repositoryRoot, schemaPath });
  const candidate = deepClone(to);

  for (const service of selectedServices) {
    candidate.services[service] = { ...from.services[service] };
  }

  validateManifestObject(candidate, toPath, { repositoryRoot, schemaPath });

  for (const candidateService of runtimeServices) {
    if (!selectedServices.includes(candidateService) && !sameJson(to.services[candidateService], candidate.services[candidateService])) {
      throw new Error(`${candidateService} changed during promotion but was not requested.`);
    }
  }

  const changes = changesForServices(to, candidate, selectedServices);
  const changedCount = changes.filter((change) => change.changed).length;
  const summary = markdownSummary(
    'Production promotion',
    changes,
    runtimeServices.filter((candidateService) => !selectedServices.includes(candidateService)),
  );

  if (changedCount > 0) {
    writeManifestFile(toPath, candidate, { repositoryRoot, schemaPath });
  }

  writeOptionalSummary(summaryFile, summary, repositoryRoot);

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      changed_count: String(changedCount),
      services: selectedServices.join(','),
    });
  }

  return { changedCount, changes, summary };
}

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
  const template = loadYamlFile(templatePath, repositoryRoot);
  const candidate = deepClone(template);

  if (!candidate.services || typeof candidate.services !== 'object' || Array.isArray(candidate.services)) {
    throw new Error(`${templatePath} must contain a services object.`);
  }

  for (const service of runtimeServices) {
    if (!candidate.services[service]) {
      throw new Error(`${templatePath} is missing service '${service}'.`);
    }

    candidate.services[service].image = manifest.services[service].image;
  }

  if (candidate.volumes && typeof candidate.volumes === 'object' && !Array.isArray(candidate.volumes)) {
    for (const [volumeName, volumeConfig] of Object.entries(candidate.volumes)) {
      if (volumeConfig === null) {
        candidate.volumes[volumeName] = {};
      }
    }
  }

  const content = yaml.dump(candidate, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
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
  const matrix = { include: images };

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      count: String(images.length),
      matrix: JSON.stringify(matrix),
    });
  }

  return images;
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return;
  }

  const [command, ...rest] = argv;
  const { options, positional } = parseArgs(rest);
  const repositoryRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();
  const common = {
    repositoryRoot,
    schemaPath: options.schema || defaultSchemaPath,
  };

  if (command === 'validate') {
    const manifestPath = options.manifest || positional[0];
    if (!manifestPath) {
      throw new Error('validate requires a manifest path.');
    }
    validateManifestFile(manifestPath, common);
    console.log(`Validated ${manifestPath}.`);
    return;
  }

  if (command === 'update') {
    const updates = options['metadata-dir']
      ? entriesFromMetadataDir(options['metadata-dir'], repositoryRoot)
      : entryFromOptions(options);
    const result = updateManifest({
      manifestPath: options.manifest,
      updates,
      summaryFile: options['summary-file'],
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(result.summary.trimEnd());
    return;
  }

  if (command === 'promote') {
    const services = options.service === 'all'
      ? runtimeServices
      : String(options.service || '').split(',').map((service) => service.trim()).filter(Boolean);
    const result = promoteServices({
      services,
      fromPath: options.from,
      toPath: options.to,
      summaryFile: options['summary-file'],
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(result.summary.trimEnd());
    return;
  }

  if (command === 'render-compose-env') {
    const lines = renderComposeEnv({
      manifestPath: options.manifest,
      outputPath: options.output,
      ...common,
    });
    console.log(`Wrote ${lines.length} image refs to ${options.output}.`);
    return;
  }

  if (command === 'render-compose') {
    renderComposeFile({
      manifestPath: options.manifest,
      outputPath: options.output,
      templatePath: options.template || 'compose.prod.yml',
      ...common,
    });
    console.log(`Rendered Compose file ${options.output} from ${options.manifest}.`);
    return;
  }

  if (command === 'verify-compose') {
    verifyComposeFile({
      manifestPath: options.manifest,
      composePath: options.compose,
      ...common,
    });
    console.log(`Verified ${options.compose} against ${options.manifest}.`);
    return;
  }

  if (command === 'validate-compose') {
    validateComposeConfig({
      manifestPath: options.manifest,
      outputPath: options.output,
      ...common,
    });
    console.log(`Validated Compose config for ${options.manifest}.`);
    return;
  }

  if (command === 'list-images') {
    const images = listImages({
      manifestPath: options.manifest,
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(JSON.stringify(images, null, 2));
    return;
  }

  throw new Error(`Unknown command '${command}'.\n${usage()}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
