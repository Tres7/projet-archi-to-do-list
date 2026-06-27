import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compareSemver, parseSemver } from './semver-utils.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || path.resolve(path.dirname(scriptPath), '../..');
const defaultMatrixPath = 'deploy/compatibility.yaml';
const require = createRequire(import.meta.url);
const yaml = require('../../server/node_modules/js-yaml');

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
    if (next === undefined || next.startsWith('--')) {
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
  node .github/scripts/compatibility.mjs validate --manifest <path> [--matrix deploy/compatibility.yaml] [--no-sanity]

Validates that the service versions pinned in a deployment manifest satisfy the API contract compatibility matrix.`;
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
      throw new Error('file must be a YAML object');
    }
    return document;
  } catch (error) {
    throw new Error(`Cannot parse YAML ${filePath}: ${error.message}`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function normalizeVersions(value, label) {
  const versions = Array.isArray(value) ? value : [value];

  for (const version of versions) {
    if (typeof version !== 'string' || version.trim() === '') {
      throw new Error(`${label} must contain non-empty string API versions.`);
    }
  }

  return versions;
}

function compareVersionToTarget(version, target) {
  return compareSemver(parseSemver(version), parseSemver(target));
}

function evaluateComparator(version, comparator) {
  const match = comparator.match(/^(>=|>|<=|<|=)?(.+)$/);
  if (!match) {
    throw new Error(`Invalid version comparator '${comparator}'.`);
  }

  const operator = match[1] || '=';
  const target = match[2].trim();
  const compared = compareVersionToTarget(version, target);

  switch (operator) {
    case '>':
      return compared > 0;
    case '>=':
      return compared >= 0;
    case '<':
      return compared < 0;
    case '<=':
      return compared <= 0;
    case '=':
      return compared === 0;
    default:
      throw new Error(`Unsupported version comparator '${operator}'.`);
  }
}

function versionSatisfiesRange(version, range) {
  parseSemver(version);

  if (typeof range !== 'string' || range.trim() === '') {
    throw new Error(`Compatibility range must be a non-empty string.`);
  }

  const comparators = range.trim().split(/\s+/);
  return comparators.every((comparator) => evaluateComparator(version, comparator));
}

function serviceVersion(manifest, service) {
  const entry = manifest.services?.[service];
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Manifest is missing service '${service}'.`);
  }
  if (typeof entry.version !== 'string') {
    throw new Error(`Manifest service '${service}' must have a string version.`);
  }
  parseSemver(entry.version, service);
  return entry.version;
}

function resolveRule(rules, version, service, contractName, role) {
  assertObject(rules, `${contractName}.${role}.${service}`);

  for (const [range, value] of Object.entries(rules)) {
    if (versionSatisfiesRange(version, range)) {
      return {
        range,
        versions: normalizeVersions(value, `${contractName}.${role}.${service}.${range}`),
      };
    }
  }

  throw new Error(`No compatibility rule found for ${role} ${service} ${version} in contract ${contractName}.`);
}

function missingVersions(required, available) {
  const availableSet = new Set(available);
  return required.filter((version) => !availableSet.has(version));
}

function routeLiteral(version, resource) {
  return version === 'legacy' ? `/api/${resource}` : `/api/${version}/${resource}`;
}

function providerFixturePaths(contractName, service, version) {
  if (contractName !== 'authApi' || service !== 'auth-service') {
    return [];
  }

  if (version === 'legacy') {
    return ['server/apps/auth-service/src/app.ts'];
  }

  return [
    `server/apps/auth-service/openapi/${version}/auth.yml`,
    `server/apps/auth-service/openapi/${version}/users.yml`,
  ];
}

function assertProviderSanity({ contractName, service, version, repositoryRoot }) {
  for (const fixturePath of providerFixturePaths(contractName, service, version)) {
    if (!fs.existsSync(resolvePath(fixturePath, repositoryRoot))) {
      throw new Error(`${service} declares ${contractName} ${version}, but ${fixturePath} does not exist.`);
    }
  }

  if (contractName === 'authApi' && service === 'auth-service' && version === 'legacy') {
    const appPath = 'server/apps/auth-service/src/app.ts';
    const content = fs.readFileSync(resolvePath(appPath, repositoryRoot), 'utf8');
    for (const route of [`'/auth'`, `'/users'`]) {
      if (!content.includes(route)) {
        throw new Error(`${service} declares ${contractName} legacy, but ${appPath} does not contain ${route}.`);
      }
    }
  }
}

function assertGatewaySanity({ contractName, service, version, repositoryRoot }) {
  if (contractName !== 'authApi' || service !== 'gateway') {
    return;
  }

  const routesPath = 'server/apps/gateway/routes.ts';
  const content = fs.readFileSync(resolvePath(routesPath, repositoryRoot), 'utf8');

  for (const resource of ['auth', 'users']) {
    const route = routeLiteral(version, resource);
    if (!content.includes(route)) {
      throw new Error(`${service} declares ${contractName} ${version}, but ${routesPath} does not contain ${route}.`);
    }
  }
}

function runSanityChecks(matrix, repositoryRoot) {
  for (const [contractName, contract] of Object.entries(matrix.contracts)) {
    for (const [service, rules] of Object.entries(contract.providers || {})) {
      for (const value of Object.values(rules)) {
        for (const version of normalizeVersions(value, `${contractName}.providers.${service}`)) {
          assertProviderSanity({ contractName, service, version, repositoryRoot });
        }
      }
    }

    for (const [service, rules] of Object.entries(contract.gateways || {})) {
      for (const value of Object.values(rules)) {
        for (const version of normalizeVersions(value, `${contractName}.gateways.${service}`)) {
          assertGatewaySanity({ contractName, service, version, repositoryRoot });
        }
      }
    }
  }
}

function validateMatrix(matrix) {
  if (matrix.schemaVersion !== 1) {
    throw new Error(`compatibility schemaVersion must be 1, got ${matrix.schemaVersion}.`);
  }

  assertObject(matrix.contracts, 'contracts');
}

export function validateCompatibility({
  manifestPath,
  matrixPath = defaultMatrixPath,
  repositoryRoot = defaultRoot,
  sanity = true,
} = {}) {
  if (!manifestPath) {
    throw new Error('--manifest is required.');
  }

  const manifest = loadYamlFile(manifestPath, repositoryRoot);
  const matrix = loadYamlFile(matrixPath, repositoryRoot);
  validateMatrix(matrix);

  if (sanity) {
    runSanityChecks(matrix, repositoryRoot);
  }

  const errors = [];

  for (const [contractName, contract] of Object.entries(matrix.contracts)) {
    assertObject(contract, `contracts.${contractName}`);
    assertObject(contract.consumers, `contracts.${contractName}.consumers`);
    assertObject(contract.providers, `contracts.${contractName}.providers`);
    assertObject(contract.gateways, `contracts.${contractName}.gateways`);

    const providerResults = Object.entries(contract.providers).map(([service, rules]) => {
      const version = serviceVersion(manifest, service);
      const rule = resolveRule(rules, version, service, contractName, 'provider');
      return { service, version, ...rule };
    });

    const gatewayResults = Object.entries(contract.gateways).map(([service, rules]) => {
      const version = serviceVersion(manifest, service);
      const rule = resolveRule(rules, version, service, contractName, 'gateway');
      return { service, version, ...rule };
    });

    for (const [service, rules] of Object.entries(contract.consumers)) {
      const version = serviceVersion(manifest, service);
      const consumer = resolveRule(rules, version, service, contractName, 'consumer');

      for (const provider of providerResults) {
        const missing = missingVersions(consumer.versions, provider.versions);
        if (missing.length > 0) {
          errors.push(`${service} ${version} requires ${contractName} [${consumer.versions.join(', ')}], but ${provider.service} ${provider.version} provides only [${provider.versions.join(', ')}]. Missing: [${missing.join(', ')}].`);
        }
      }

      for (const gateway of gatewayResults) {
        const missing = missingVersions(consumer.versions, gateway.versions);
        if (missing.length > 0) {
          errors.push(`${service} ${version} requires ${contractName} [${consumer.versions.join(', ')}], but ${gateway.service} ${gateway.version} exposes only [${gateway.versions.join(', ')}]. Missing: [${missing.join(', ')}].`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Compatibility check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return { manifestPath, matrixPath };
}

function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (command !== 'validate') {
    throw new Error(usage());
  }

  validateCompatibility({
    manifestPath: options.manifest,
    matrixPath: options.matrix || defaultMatrixPath,
    repositoryRoot: defaultRoot,
    sanity: options.sanity !== 'false' && options['no-sanity'] !== 'true',
  });

  console.log(`Compatibility check passed for ${options.manifest}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
