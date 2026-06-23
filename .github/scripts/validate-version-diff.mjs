import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();

const allowedPatterns = [
  /^server\/apps\/[^/]+\/package\.json$/,
  /^server\/apps\/[^/]+\/CHANGELOG\.md$/,
  /^server\/common\/package\.json$/,
  /^server\/common\/CHANGELOG\.md$/,
  /^server\/package-lock\.json$/,
  /^client\/package\.json$/,
  /^client\/package-lock\.json$/,
  /^client\/CHANGELOG\.md$/,
];

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

function runGit(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function normalizePath(filePath) {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(root, filePath)
    : filePath;

  return relativePath.replaceAll(path.sep, '/').replace(/^\.\//, '').trim();
}

function splitFiles(value) {
  return value
    .split(/\r?\n|,/)
    .map(normalizePath)
    .filter(Boolean);
}

function parseChangedFiles(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(normalizePath).filter(Boolean);
    }
  } catch {
    // Fall through to newline or comma separated input for local use.
  }

  return splitFiles(trimmed);
}

function changedFilesFromGit({ base, head }) {
  const files = new Set();
  const diffArgs = ['diff', '--name-only', base];

  if (head) {
    diffArgs.push(head);
  }

  diffArgs.push('--');

  for (const filePath of splitFiles(runGit(diffArgs))) {
    files.add(filePath);
  }

  if (!head) {
    for (const filePath of splitFiles(runGit(['ls-files', '--others', '--exclude-standard']))) {
      files.add(filePath);
    }
  }

  return [...files].sort();
}

function changedFilesFromStatus() {
  return runGit(['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/)
    .map((line) => line.slice(3))
    .map((filePath) => filePath.includes(' -> ') ? filePath.split(' -> ').at(-1) : filePath)
    .map(normalizePath)
    .filter(Boolean)
    .sort();
}

function isChangesetFile(filePath) {
  return (
    /^server\/\.changeset\/[^/]+\.md$/.test(filePath) ||
    /^client\/\.changeset\/[^/]+\.md$/.test(filePath)
  ) && !filePath.endsWith('/README.md');
}

function isAllowedVersionFile(filePath) {
  return isChangesetFile(filePath) ||
    allowedPatterns.some((pattern) => pattern.test(filePath));
}

function collectChangedFiles(options) {
  if (options['changed-files']) {
    return parseChangedFiles(options['changed-files']);
  }

  if (options.base) {
    return changedFilesFromGit({ base: options.base, head: options.head });
  }

  return changedFilesFromStatus();
}

const options = parseArgs(process.argv.slice(2));
const changedFiles = collectChangedFiles(options);
const unexpectedFiles = changedFiles.filter((filePath) => !isAllowedVersionFile(filePath));

if (unexpectedFiles.length > 0) {
  console.error('::error::Versioning produced unexpected files:');
  for (const filePath of unexpectedFiles) {
    console.error(`::error:: - ${filePath}`);
  }
  console.error('Allowed version files are package manifests, package locks, generated changelogs, and consumed changeset markdown files.');
  process.exit(1);
}

if (changedFiles.length === 0) {
  console.log('No version diff found.');
} else {
  console.log('Version diff contains only allowed files:');
  for (const filePath of changedFiles) {
    console.log(`- ${filePath}`);
  }
}
