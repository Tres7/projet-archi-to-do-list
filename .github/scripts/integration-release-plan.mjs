import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareSemver, parseSemver } from './semver-utils.mjs';
import { runtimeServices, serviceConfigById } from './services.mjs';
import { latestManifest, validateManifestFile } from './manifest.mjs';

const defaultRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument '${arg}'.`);
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function resolvePath(filePath, repositoryRoot = defaultRoot) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repositoryRoot, filePath);
}

function readPackageVersion(config, repositoryRoot = defaultRoot) {
  const packagePath = resolvePath(`${config.packagePath}/package.json`, repositoryRoot);
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function parseMatrix(value) {
  if (!value) {
    throw new Error('Missing service matrix.');
  }

  const matrix = JSON.parse(value);
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) || !Array.isArray(matrix.include)) {
    throw new Error('Service matrix must be an object with an include array.');
  }

  return matrix.include;
}

function versionIncreased(nextVersion, previousVersion) {
  return compareSemver(parseSemver(nextVersion), parseSemver(previousVersion)) > 0;
}

function markdownSummary(rows, errors) {
  const lines = [
    '## Integration release plan',
    '',
    '| service | previous manifest version | package version | result |',
    '| --- | --- | --- | --- |',
  ];

  if (rows.length === 0) {
    lines.push('| none | - | - | no service package versions changed |');
  } else {
    for (const row of rows) {
      lines.push(`| ${row.service} | ${row.previousVersion} | ${row.version} | ${row.result} |`);
    }
  }

  if (errors.length > 0) {
    lines.push('', 'Release plan failed:', '');
    for (const error of errors) {
      lines.push(`- ${error}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function validateIntegrationReleasePlan({
  matrix,
  manifestPath,
  repositoryRoot = defaultRoot,
  summaryFile,
}) {
  if (!manifestPath) {
    throw new Error('validate integration release plan requires --manifest <path>.');
  }

  const services = typeof matrix === 'string' ? parseMatrix(matrix) : matrix?.include;
  if (!Array.isArray(services)) {
    throw new Error('Service matrix must be an object with an include array.');
  }
  const effectiveManifestPath = manifestPath === 'latest'
    ? latestManifest({ repositoryRoot }).manifestPath
    : manifestPath;
  const manifest = validateManifestFile(effectiveManifestPath, { repositoryRoot });
  const seen = new Set();
  const rows = [];
  const errors = [];

  for (const item of services) {
    const service = item.service;
    const version = item.version;

    if (!runtimeServices.includes(service)) {
      errors.push(`Unknown service '${service}' in release matrix.`);
      rows.push({
        service: service || '<missing>',
        previousVersion: '-',
        version: version || '-',
        result: 'failed: unknown service',
      });
      continue;
    }

    if (seen.has(service)) {
      errors.push(`Duplicate service '${service}' in release matrix.`);
    }
    seen.add(service);

    const config = serviceConfigById.get(service);
    const packageVersion = readPackageVersion(config, repositoryRoot);
    const previousVersion = manifest.services[service].version;
    let result = 'ok';

    try {
      parseSemver(version, service);
    } catch {
      errors.push(`${service} package version '${version}' is not valid SemVer.`);
      result = 'failed: invalid SemVer';
    }

    if (version !== packageVersion) {
      errors.push(`${service} matrix version '${version}' does not match ${config.packagePath}/package.json version '${packageVersion}'.`);
      result = 'failed: package mismatch';
    }

    if (result === 'ok' && !versionIncreased(version, previousVersion)) {
      errors.push(`${service} version was not increased: package version '${version}' must be greater than previous integration manifest version '${previousVersion}'.`);
      result = 'failed: version was not increased';
    }

    rows.push({
      service,
      previousVersion,
      version,
      result,
    });
  }

  const summary = markdownSummary(rows, errors);
  if (summaryFile) {
    fs.writeFileSync(resolvePath(summaryFile, repositoryRoot), summary);
  }

  if (errors.length > 0) {
    throw new Error(`Integration release plan failed: ${errors.join('; ')}`);
  }

  return { services: rows.map((row) => row.service), summary };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = validateIntegrationReleasePlan({
    matrix: options.matrix,
    manifestPath: options.manifest,
    repositoryRoot: process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd(),
    summaryFile: options['summary-file'],
  });

  console.log(result.summary.trimEnd());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
