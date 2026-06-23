import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findSection, main } from './extract-changelog-section.mjs';

const changelog = `# @app/auth-service

## 1.2.0

### Minor Changes

- New auth behavior.

### Patch Changes

- Tightened validation.

## 1.1.0

### Patch Changes

- Older fix.
`;

test('finds only the requested changelog section', () => {
  assert.equal(
    findSection(changelog, '1.2.0'),
    '### Minor Changes\n\n- New auth behavior.\n\n### Patch Changes\n\n- Tightened validation.',
  );
});

test('returns an empty string for a missing version', () => {
  assert.equal(findSection(changelog, '9.9.9'), '');
});

test('reads the last section through end of file', () => {
  assert.equal(
    findSection(changelog, '1.1.0'),
    '### Patch Changes\n\n- Older fix.',
  );
});

test('CLI writes a release notes file for an existing version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-section-'));
  const changelogPath = path.join(dir, 'CHANGELOG.md');
  const outputPath = path.join(dir, 'notes.md');
  fs.writeFileSync(changelogPath, changelog);

  main(['--changelog', changelogPath, '--version', '1.2.0', '--output', outputPath]);

  assert.equal(
    fs.readFileSync(outputPath, 'utf8'),
    '### Minor Changes\n\n- New auth behavior.\n\n### Patch Changes\n\n- Tightened validation.\n',
  );
});

test('CLI throws a clear error for an absent version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-section-'));
  const changelogPath = path.join(dir, 'CHANGELOG.md');
  fs.writeFileSync(changelogPath, changelog);

  assert.throws(
    () => main(['--changelog', changelogPath, '--version', '9.9.9', '--output', path.join(dir, 'notes.md')]),
    /No changelog section found/,
  );
});
