import fs from 'node:fs';
import path from 'node:path';

const root = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();
const validTypes = new Set(['patch', 'minor', 'major']);
const backendCommand = 'npm --prefix server run changeset';
const clientCommand = 'npm --prefix client run changeset';
const versionBranch = 'changesets/version-packages';

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

const args = parseArgs(process.argv.slice(2));

function option(name, envName, fallback = '') {
  return args[name] ?? process.env[envName] ?? fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function workspacePackageJsonPaths(rootPackagePath) {
  const rootPackage = readJson(rootPackagePath);
  const rootDir = path.dirname(rootPackagePath);
  const packagePaths = [rootPackagePath];

  for (const workspace of rootPackage.workspaces || []) {
    if (workspace.endsWith('/*')) {
      const workspaceRoot = path.join(rootDir, workspace.slice(0, -2));
      if (!fs.existsSync(workspaceRoot)) {
        continue;
      }

      for (const entry of fs.readdirSync(workspaceRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const packagePath = path.join(workspaceRoot, entry.name, 'package.json');
          if (fs.existsSync(packagePath)) {
            packagePaths.push(packagePath);
          }
        }
      }

      continue;
    }

    const packagePath = path.join(rootDir, workspace, 'package.json');
    if (fs.existsSync(packagePath)) {
      packagePaths.push(packagePath);
    }
  }

  return packagePaths;
}

function packageNames(packageJsonPaths) {
  return new Set(packageJsonPaths.map((packagePath) => readJson(packagePath).name).filter(Boolean));
}

function changesetFiles(changesetDir) {
  if (!fs.existsSync(changesetDir)) {
    return [];
  }

  return fs.readdirSync(changesetDir)
    .filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
    .map((fileName) => path.join(changesetDir, fileName));
}

function parseChangeset(filePath, knownPackages, command, errors) {
  const relativePath = path.relative(root, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    errors.push(`${relativePath} is missing Changesets frontmatter. Run: ${command}`);
    return [];
  }

  const releases = [];
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const release = line.match(/^['"]?([^'":]+(?:\/[^'":]+)?)['"]?:\s*([A-Za-z]+)\s*$/);
    if (!release) {
      errors.push(`${relativePath} has invalid release syntax '${line}'. Run: ${command}`);
      continue;
    }

    const [, packageName, releaseType] = release;
    if (!knownPackages.has(packageName)) {
      errors.push(`${relativePath} references unknown package '${packageName}'. Run: ${command}`);
    }

    if (!validTypes.has(releaseType)) {
      errors.push(`${relativePath} uses invalid change type '${releaseType}' for '${packageName}'. Use patch, minor, or major. Run: ${command}`);
    }

    releases.push(packageName);
  }

  if (releases.length === 0) {
    errors.push(`${relativePath} does not list any package releases. Run: ${command}`);
  }

  return releases;
}

function parseRequiredPackages(value) {
  return [...new Set(
    value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

function parseChangedFiles(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Fall through to newline parsing for local shell usage.
  }

  return trimmed.split(/\r?\n/).map((file) => file.trim()).filter(Boolean);
}

function isVersionPrAllowedFile(filePath) {
  return [
    /^server\/\.changeset\/[^/]+\.md$/,
    /^client\/\.changeset\/[^/]+\.md$/,
    /^server\/apps\/[^/]+\/package\.json$/,
    /^server\/common\/package\.json$/,
    /^server\/package-lock\.json$/,
    /^client\/package\.json$/,
    /^client\/package-lock\.json$/,
    /^server\/apps\/[^/]+\/CHANGELOG\.md$/,
    /^server\/common\/CHANGELOG\.md$/,
    /^client\/CHANGELOG\.md$/,
  ].some((pattern) => pattern.test(filePath));
}

function isVersionPrChangedFileSet({ branchName, changedFiles }) {
  if (branchName !== versionBranch || changedFiles.length === 0) {
    return false;
  }

  const hasVersionArtifact = changedFiles.some((filePath) => (
    /(^|\/)package\.json$/.test(filePath) ||
    /(^|\/)package-lock\.json$/.test(filePath) ||
    /(^|\/)CHANGELOG\.md$/.test(filePath)
  ));
  const hasChangesetArtifact = changedFiles.some((filePath) => (
    /^server\/\.changeset\/[^/]+\.md$/.test(filePath) ||
    /^client\/\.changeset\/[^/]+\.md$/.test(filePath)
  ));

  return hasVersionArtifact &&
    hasChangesetArtifact &&
    changedFiles.every(isVersionPrAllowedFile);
}

function validateContext({ changesetDir, knownPackages, command, requiredPackages, errors }) {
  const coveredPackages = new Set();

  for (const filePath of changesetFiles(changesetDir)) {
    for (const packageName of parseChangeset(filePath, knownPackages, command, errors)) {
      coveredPackages.add(packageName);
    }
  }

  for (const packageName of requiredPackages) {
    if (!knownPackages.has(packageName)) {
      errors.push(`Required package '${packageName}' is not a package in this Changesets context. Run: ${command}`);
      continue;
    }

    if (!coveredPackages.has(packageName)) {
      errors.push(`Missing changeset for '${packageName}'. Run: ${command}`);
    }
  }

  return coveredPackages;
}

const branchName = option('pr-head-ref', 'PR_HEAD_REF');
const changedFiles = parseChangedFiles(option('changed-files', 'CHANGED_FILES'));

if (isVersionPrChangedFileSet({ branchName, changedFiles })) {
  console.log(`Technical Version PR detected on '${versionBranch}'. No new changeset is required.`);
  console.log(`Validated Version PR files: ${changedFiles.join(', ')}`);
  process.exit(0);
}

if (branchName === versionBranch && changedFiles.length > 0) {
  const unexpectedFiles = changedFiles.filter((filePath) => !isVersionPrAllowedFile(filePath));
  if (unexpectedFiles.length > 0) {
    console.error(`::error::Technical Version PR branch contains unexpected files: ${unexpectedFiles.join(', ')}`);
    process.exit(1);
  }
}

const errors = [];
const backendPackages = packageNames(workspacePackageJsonPaths(path.join(root, 'server/package.json')));
const clientPackageName = readJson(path.join(root, 'client/package.json')).name;
const clientPackages = new Set([clientPackageName]);
const backendRequiredPackages = parseRequiredPackages(option('backend-required', 'BACKEND_REQUIRED_PACKAGES'));
const clientRequired = option('client-required', 'CLIENT_REQUIRED', 'false').toLowerCase() === 'true';

const backendCovered = validateContext({
  changesetDir: path.join(root, 'server/.changeset'),
  knownPackages: backendPackages,
  command: backendCommand,
  requiredPackages: backendRequiredPackages,
  errors,
});

const clientCovered = validateContext({
  changesetDir: path.join(root, 'client/.changeset'),
  knownPackages: clientPackages,
  command: clientCommand,
  requiredPackages: clientRequired ? [clientPackageName] : [],
  errors,
});

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`::error::${error}`);
  }
  process.exit(1);
}

console.log(`Backend required packages: ${backendRequiredPackages.sort().join(', ') || 'none'}`);
console.log(`Backend changesets cover: ${[...backendCovered].sort().join(', ') || 'none'}`);
console.log(`Client changeset required: ${clientRequired ? clientPackageName : 'no'}`);
console.log(`Client changesets cover: ${[...clientCovered].sort().join(', ') || 'none'}`);
