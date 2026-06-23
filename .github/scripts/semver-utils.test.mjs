import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, isValidSemver, parseSemver } from './semver-utils.mjs';

test('accepts valid SemVer versions', () => {
  for (const version of [
    '1.0.0',
    '0.1.2-alpha.1',
    '2.0.0-rc.1+build.5',
    '1.2.3+001',
    '10.20.30-alpha-beta',
  ]) {
    assert.equal(isValidSemver(version), true, version);
  }
});

test('rejects invalid SemVer versions', () => {
  const pathological = `0.0.0-0.${'-.'.repeat(2000)}`;

  for (const version of [
    '',
    '01.0.0',
    '1.02.0',
    '1.0.03',
    '1.0',
    '1.0.0-',
    '1.0.0-alpha..1',
    '1.0.0-01',
    '1.0.0+',
    '1.0.0+build..1',
    pathological,
  ]) {
    assert.equal(isValidSemver(version), false, version);
  }
});

test('compares SemVer precedence without build metadata', () => {
  assert.equal(Math.sign(compareSemver(parseSemver('1.0.1'), parseSemver('1.0.0'))), 1);
  assert.equal(Math.sign(compareSemver(parseSemver('1.0.0-alpha.2'), parseSemver('1.0.0-alpha.10'))), -1);
  assert.equal(Math.sign(compareSemver(parseSemver('1.0.0'), parseSemver('1.0.0-rc.1'))), 1);
  assert.equal(compareSemver(parseSemver('1.0.0+build.2'), parseSemver('1.0.0+build.1')), 0);
});
