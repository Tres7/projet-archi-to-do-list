import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const runtimeServices = [
  'auth-service',
  'project-service',
  'task-service',
  'notification-service',
  'gateway',
  'client',
];

export const serviceConfigs = [
  {
    service: 'auth-service',
    packageName: '@app/auth-service',
    packagePath: 'server/apps/auth-service',
    dockerfile: 'server/apps/auth-service/Dockerfile',
    context: 'server',
    imageName: 'auth-service',
    changelog: 'server/apps/auth-service/CHANGELOG.md',
    commonConsumer: true,
  },
  {
    service: 'project-service',
    packageName: '@app/project-service',
    packagePath: 'server/apps/project-service',
    dockerfile: 'server/apps/project-service/Dockerfile',
    context: 'server',
    imageName: 'project-service',
    changelog: 'server/apps/project-service/CHANGELOG.md',
    commonConsumer: true,
  },
  {
    service: 'task-service',
    packageName: '@app/task-service',
    packagePath: 'server/apps/task-service',
    dockerfile: 'server/apps/task-service/Dockerfile',
    context: 'server',
    imageName: 'task-service',
    changelog: 'server/apps/task-service/CHANGELOG.md',
    commonConsumer: true,
  },
  {
    service: 'notification-service',
    packageName: '@app/notification-service',
    packagePath: 'server/apps/notification-service',
    dockerfile: 'server/apps/notification-service/Dockerfile',
    context: 'server',
    imageName: 'notification-service',
    changelog: 'server/apps/notification-service/CHANGELOG.md',
    commonConsumer: true,
  },
  {
    service: 'gateway',
    packageName: '@app/gateway',
    packagePath: 'server/apps/gateway',
    dockerfile: 'server/apps/gateway/Dockerfile',
    context: 'server',
    imageName: 'gateway',
    changelog: 'server/apps/gateway/CHANGELOG.md',
    commonConsumer: false,
  },
  {
    service: 'client',
    packageName: 'client',
    packagePath: 'client',
    dockerfile: 'client/Dockerfile',
    context: 'client',
    imageName: 'client',
    changelog: 'client/CHANGELOG.md',
    commonConsumer: false,
  },
];

export const serviceConfigById = new Map(serviceConfigs.map((config) => [config.service, config]));

const root = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();

export function normalizePath(filePath, repositoryRoot = root) {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(repositoryRoot, filePath)
    : filePath;

  return relativePath.replaceAll(path.sep, '/').replace(/^\.\//, '').trim();
}

export function splitFiles(value, repositoryRoot = root) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((filePath) => normalizePath(filePath, repositoryRoot))
    .filter(Boolean);
}

export function runGit(args, repositoryRoot = root) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function verifyRevision(name, revision, repositoryRoot = root) {
  if (!revision) {
    throw new Error(`Missing ${name} revision.`);
  }

  try {
    return runGit(['rev-parse', '--verify', `${revision}^{commit}`], repositoryRoot).trim();
  } catch (error) {
    throw new Error(`Invalid ${name} revision '${revision}': ${error.stderr?.trim() || error.message}`);
  }
}

export function mergeBaseBetween({ base, head, repositoryRoot = root }) {
  try {
    return runGit(['merge-base', base, head], repositoryRoot).trim();
  } catch (error) {
    throw new Error(`Unable to find merge base between '${base}' and '${head}': ${error.stderr?.trim() || error.message}`);
  }
}

export function changedFilesBetween({ base, head, repositoryRoot = root }) {
  const mergeBase = mergeBaseBetween({ base, head, repositoryRoot });
  const files = new Set();

  for (const filePath of splitFiles(runGit(['diff', '--name-only', mergeBase, head, '--'], repositoryRoot), repositoryRoot)) {
    files.add(filePath);
  }

  return [...files].sort();
}

function readJson(filePath, repositoryRoot = root) {
  return JSON.parse(fs.readFileSync(path.resolve(repositoryRoot, filePath), 'utf8'));
}

function currentVersion(config, repositoryRoot = root) {
  return readJson(`${config.packagePath}/package.json`, repositoryRoot).version;
}

function isServerWorkspaceFile(filePath) {
  return [
    /^server\/package\.json$/,
    /^server\/package-lock\.json$/,
    /^server\/tsconfig.*\.json$/,
    /^server\/types\//,
    /^server\/\.dockerignore$/,
    /^\.dockerignore$/,
  ].some((pattern) => pattern.test(filePath));
}

function isCommonRuntimeFile(filePath) {
  return /^server\/common\//.test(filePath) &&
    !/^server\/common\/CHANGELOG\.md$/.test(filePath);
}

function isAppRuntimeFile(config, filePath) {
  if (config.service === 'client') {
    return [
      /^client\/src\//,
      /^client\/index\.html$/,
      /^client\/vite\.config\.ts$/,
      /^client\/tsconfig.*\.json$/,
      /^client\/package\.json$/,
      /^client\/package-lock\.json$/,
      /^client\/Dockerfile$/,
      /^client\/nginx\.conf$/,
      /^client\/\.dockerignore$/,
    ].some((pattern) => pattern.test(filePath));
  }

  const escapedService = config.service.replaceAll('-', '\\-');
  return [
    new RegExp(`^server/apps/${escapedService}/src/`),
    new RegExp(`^server/apps/${escapedService}/index\\.ts$`),
    new RegExp(`^server/apps/${escapedService}/tsconfig\\.json$`),
    new RegExp(`^server/apps/${escapedService}/package\\.json$`),
    new RegExp(`^server/apps/${escapedService}/Dockerfile$`),
  ].some((pattern) => pattern.test(filePath));
}

function isDockerCiFile(filePath) {
  return [
    /^\.github\/actions\/build-service-image\//,
    /^\.github\/actions\/detect-ci-plan\//,
    /^\.github\/scripts\/ci-plan\.mjs$/,
    /^\.github\/scripts\/services\.mjs$/,
    /^\.github\/workflows\/pr_main\.yml$/,
    /^\.github\/workflows\/pre_push_main\.yml$/,
  ].some((pattern) => pattern.test(filePath));
}

export function affectedServiceConfigs(changedFiles, {
  includeCiChanges = false,
  repositoryRoot = root,
} = {}) {
  const files = changedFiles.map((filePath) => normalizePath(filePath, repositoryRoot));
  const allDockerServices = includeCiChanges && files.some(isDockerCiFile);

  return serviceConfigs.filter((config) => {
    if (allDockerServices) {
      return true;
    }

    return files.some((filePath) => (
      isAppRuntimeFile(config, filePath) ||
      (config.service !== 'client' && isServerWorkspaceFile(filePath)) ||
      (config.commonConsumer && isCommonRuntimeFile(filePath))
    ));
  });
}

export function versionedServiceConfigs(changedFiles, {
  repositoryRoot = root,
} = {}) {
  const files = changedFiles.map((filePath) => normalizePath(filePath, repositoryRoot));
  const changedFileSet = new Set(files);

  return serviceConfigs.filter((config) => (
    changedFileSet.has(`${config.packagePath}/package.json`)
  ));
}

export function serviceMatrix(changedFiles, options = {}) {
  const include = affectedServiceConfigs(changedFiles, options).map((config) => ({
    service: config.service,
    packageName: config.packageName,
    packagePath: config.packagePath,
    version: currentVersion(config, options.repositoryRoot || root),
    dockerfile: config.dockerfile,
    context: config.context,
    imageName: config.imageName,
    changelog: config.changelog,
  }));

  return { include };
}

export function versionedServiceMatrix(changedFiles, options = {}) {
  const include = versionedServiceConfigs(changedFiles, options).map((config) => ({
    service: config.service,
    packageName: config.packageName,
    packagePath: config.packagePath,
    version: currentVersion(config, options.repositoryRoot || root),
    dockerfile: config.dockerfile,
    context: config.context,
    imageName: config.imageName,
    changelog: config.changelog,
  }));

  return { include };
}

export function lowerGhcrImageRoot(repositoryName) {
  if (!repositoryName) {
    throw new Error('Missing repository name for GHCR image root.');
  }

  return `ghcr.io/${repositoryName.toLowerCase()}`;
}
