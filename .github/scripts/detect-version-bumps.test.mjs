import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBumps } from './detect-version-bumps.mjs';

const services = [
  ['server/apps/auth-service', '@app/auth-service'],
  ['server/apps/project-service', '@app/project-service'],
  ['server/apps/task-service', '@app/task-service'],
  ['server/apps/notification-service', '@app/notification-service'],
  ['server/apps/gateway', '@app/gateway'],
  ['client', 'client'],
];

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writePackage(repo, packagePath, name, version) {
  const fullPath = path.join(repo, packagePath);
  fs.mkdirSync(fullPath, { recursive: true });
  fs.writeFileSync(
    path.join(fullPath, 'package.json'),
    JSON.stringify({ name, version, private: true }, null, 2),
  );
}

function readPackage(repo, packagePath) {
  return JSON.parse(fs.readFileSync(path.join(repo, packagePath, 'package.json'), 'utf8'));
}

function writeFixture(repo, versions = {}) {
  for (const [packagePath, name] of services) {
    const service = packagePath.split('/').at(-1);
    writePackage(repo, packagePath, name, versions[service] || '1.0.0');
  }
}

function createRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-version-bumps-'));

  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Test User']);
  writeFixture(repo);
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'base']);
  const base = git(repo, ['rev-parse', 'HEAD']);

  return { repo, base };
}

function commitVersions(repo, versions) {
  writeFixture(repo, versions);
  git(repo, ['add', '.']);
  git(repo, ['commit', '--allow-empty', '-m', 'head']);
  return git(repo, ['rev-parse', 'HEAD']);
}

test('returns an empty matrix when runtime versions do not change', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, {});
  const matrix = detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo });

  assert.deepEqual(matrix, { include: [] });
});

test('returns one matrix item for one increased service version', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': '1.1.0' });
  const matrix = detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo });

  assert.equal(matrix.include.length, 1);
  assert.equal(matrix.include[0].service, 'auth-service');
  assert.equal(matrix.include[0].oldVersion, '1.0.0');
  assert.equal(matrix.include[0].version, '1.1.0');
  assert.equal(matrix.include[0].dockerfile, 'server/apps/auth-service/Dockerfile');
});

test('returns multiple matrix items for multiple increased versions', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, {
    'auth-service': '1.1.0',
    client: '1.1.0',
  });
  const matrix = detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo });

  assert.deepEqual(matrix.include.map((item) => item.service), ['auth-service', 'client']);
});

test('rejects invalid SemVer versions', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': 'invalid' });

  assert.throws(
    () => detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    /not valid SemVer/,
  );
});

test('rejects pathological SemVer-like versions without backtracking', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': `0.0.0-0.${'-.'.repeat(2000)}` });

  assert.throws(
    () => detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    /not valid SemVer/,
  );
});

test('rejects version decreases', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': '0.9.0' });

  assert.throws(
    () => detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    /version decreased/,
  );
});

test('rejects build metadata only changes', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': '1.0.0+build.1' });

  assert.throws(
    () => detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    /without increasing SemVer precedence/,
  );
});

test('ignores package metadata changes without a version bump', () => {
  const { repo, base } = createRepo();
  const packagePath = 'server/apps/auth-service';
  const manifest = readPackage(repo, packagePath);
  fs.writeFileSync(
    path.join(repo, packagePath, 'package.json'),
    JSON.stringify({ ...manifest, description: 'metadata only' }, null, 2),
  );
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'metadata only']);
  const head = git(repo, ['rev-parse', 'HEAD']);

  assert.deepEqual(
    detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    { include: [] },
  );
});

test('reports a clear error when the base revision is missing', () => {
  const { repo, base } = createRepo();
  const head = commitVersions(repo, { 'auth-service': '1.1.0' });

  assert.throws(
    () => detectBumps({
      baseRevision: '0000000000000000000000000000000000000000',
      headRevision: head,
      repositoryRoot: repo,
    }),
    /Cannot read server\/apps\/auth-service\/package\.json at/,
  );
});

test('reports a clear error when a runtime package is removed', () => {
  const { repo, base } = createRepo();
  fs.rmSync(path.join(repo, 'server/apps/auth-service/package.json'));
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'remove runtime package']);
  const head = git(repo, ['rev-parse', 'HEAD']);

  assert.throws(
    () => detectBumps({ baseRevision: base, headRevision: head, repositoryRoot: repo }),
    /Cannot read server\/apps\/auth-service\/package\.json at/,
  );
});
