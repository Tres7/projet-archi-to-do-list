import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();

const runtimePackages = [
  {
    service: 'auth-service',
    packagePath: 'server/apps/auth-service',
    dockerfile: 'server/apps/auth-service/Dockerfile',
    context: 'server',
    imageName: 'auth-service',
    changelog: 'server/apps/auth-service/CHANGELOG.md',
  },
  {
    service: 'project-service',
    packagePath: 'server/apps/project-service',
    dockerfile: 'server/apps/project-service/Dockerfile',
    context: 'server',
    imageName: 'project-service',
    changelog: 'server/apps/project-service/CHANGELOG.md',
  },
  {
    service: 'task-service',
    packagePath: 'server/apps/task-service',
    dockerfile: 'server/apps/task-service/Dockerfile',
    context: 'server',
    imageName: 'task-service',
    changelog: 'server/apps/task-service/CHANGELOG.md',
  },
  {
    service: 'notification-service',
    packagePath: 'server/apps/notification-service',
    dockerfile: 'server/apps/notification-service/Dockerfile',
    context: 'server',
    imageName: 'notification-service',
    changelog: 'server/apps/notification-service/CHANGELOG.md',
  },
  {
    service: 'gateway',
    packagePath: 'server/apps/gateway',
    dockerfile: 'server/apps/gateway/Dockerfile',
    context: 'server',
    imageName: 'gateway',
    changelog: 'server/apps/gateway/CHANGELOG.md',
  },
  {
    service: 'client',
    packagePath: 'client',
    dockerfile: 'client/Dockerfile',
    context: 'client',
    imageName: 'client',
    changelog: 'client/CHANGELOG.md',
  },
];

function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
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

  if (positional.length > 0) {
    options.base ??= positional[0];
  }

  if (positional.length > 1) {
    options.head ??= positional[1];
  }

  if (positional.length > 2) {
    throw new Error(`Unexpected arguments: ${positional.slice(2).join(' ')}`);
  }

  return options;
}

function runGit(args, repositoryRoot = defaultRoot) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readJsonAtRevision(revision, filePath, repositoryRoot) {
  let content;

  try {
    content = runGit(['show', `${revision}:${filePath}`], repositoryRoot);
  } catch (error) {
    throw new Error(`Cannot read ${filePath} at ${revision}: ${error.stderr?.trim() || error.message}`);
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Cannot parse ${filePath} at ${revision}: ${error.message}`);
  }
}

function verifyRevision(name, revision, repositoryRoot = defaultRoot) {
  if (!revision) {
    throw new Error(`Missing ${name} revision. Usage: node .github/scripts/detect-version-bumps.mjs <base> <head>`);
  }

  try {
    return runGit(['rev-parse', '--verify', `${revision}^{commit}`], repositoryRoot).trim();
  } catch (error) {
    throw new Error(`Invalid ${name} revision '${revision}': ${error.stderr?.trim() || error.message}`);
  }
}

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function parseSemver(version, label) {
  if (typeof version !== 'string') {
    throw new Error(`${label} version must be a string.`);
  }

  const match = version.match(semverPattern);
  if (!match) {
    throw new Error(`${label} version '${version}' is not valid SemVer.`);
  }

  return {
    original: version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }

  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) {
    return 0;
  }

  if (left.prerelease.length === 0) {
    return 1;
  }

  if (right.prerelease.length === 0) {
    return -1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) {
      return -1;
    }

    if (right.prerelease[index] === undefined) {
      return 1;
    }

    const compared = compareIdentifiers(left.prerelease[index], right.prerelease[index]);
    if (compared !== 0) {
      return compared;
    }
  }

  return 0;
}

export function detectBumps({ baseRevision, headRevision, repositoryRoot = defaultRoot }) {
  const include = [];

  for (const config of runtimePackages) {
    const packageJsonPath = `${config.packagePath}/package.json`;
    const oldPackage = readJsonAtRevision(baseRevision, packageJsonPath, repositoryRoot);
    const newPackage = readJsonAtRevision(headRevision, packageJsonPath, repositoryRoot);
    const oldVersion = oldPackage.version;
    const newVersion = newPackage.version;
    const oldSemver = parseSemver(oldVersion, `${config.service} old`);
    const newSemver = parseSemver(newVersion, `${config.service} new`);
    const compared = compareSemver(newSemver, oldSemver);

    if (compared < 0) {
      throw new Error(`${config.service} version decreased from ${oldVersion} to ${newVersion}.`);
    }

    if (compared === 0) {
      if (oldVersion !== newVersion) {
        throw new Error(`${config.service} version changed from ${oldVersion} to ${newVersion} without increasing SemVer precedence.`);
      }

      continue;
    }

    include.push({
      service: config.service,
      packageName: newPackage.name,
      packagePath: config.packagePath,
      oldVersion,
      version: newVersion,
      versionChanged: true,
      semverIncrease: true,
      dockerfile: config.dockerfile,
      context: config.context,
      imageName: config.imageName,
      changelog: config.changelog,
    });
  }

  return { include };
}

function markdownTable(items) {
  const lines = [
    '| service | old version | new version | image |',
    '| --- | --- | --- | --- |',
  ];

  if (items.length === 0) {
    lines.push('| none | - | - | - |');
    return lines.join('\n');
  }

  for (const item of items) {
    lines.push(`| ${item.service} | ${item.oldVersion} | ${item.version} | ${item.imageName} |`);
  }

  return lines.join('\n');
}

function writeGithubOutput(filePath, matrix) {
  fs.appendFileSync(filePath, [
    'matrix<<JSON',
    JSON.stringify(matrix),
    'JSON',
    `count=${matrix.include.length}`,
    `has_bumps=${matrix.include.length > 0}`,
    '',
  ].join('\n'));
}

function writeSummary(filePath, matrix, baseRevision, headRevision) {
  fs.appendFileSync(filePath, [
    '## Service version bump detection',
    '',
    `Base revision: \`${baseRevision}\``,
    '',
    `Head revision: \`${headRevision}\``,
    '',
    markdownTable(matrix.include),
    '',
  ].join('\n'));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repositoryRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();
  const baseRevision = verifyRevision('base', options.base, repositoryRoot);
  const headRevision = verifyRevision('head', options.head, repositoryRoot);
  const matrix = detectBumps({ baseRevision, headRevision, repositoryRoot });
  const output = options.pretty === 'true'
    ? JSON.stringify(matrix, null, 2)
    : JSON.stringify(matrix);

  if (options['github-output']) {
    writeGithubOutput(path.resolve(repositoryRoot, options['github-output']), matrix);
  }

  if (options['summary-file']) {
    writeSummary(path.resolve(repositoryRoot, options['summary-file']), matrix, baseRevision, headRevision);
  }

  console.log(output);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
