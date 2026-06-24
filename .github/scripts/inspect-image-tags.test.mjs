import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveImageTagState, validateReleaseInputs } from './inspect-image-tags.mjs';

test('image tag state is reusable when version and SHA tags share a digest', () => {
  assert.deepEqual(
    resolveImageTagState({
      versionDigest: 'sha256:abc',
      shaDigest: 'sha256:abc',
      versionRef: 'image:1.0.0',
      shaRef: 'image:sha-abc',
    }),
    { exists: true, digest: 'sha256:abc', missingVersionTag: false, missingShaTag: false },
  );
});

test('image tag state is buildable when both tags are missing', () => {
  assert.deepEqual(
    resolveImageTagState({ versionDigest: '', shaDigest: '' }),
    { exists: false, digest: '', missingVersionTag: false, missingShaTag: false },
  );
});

test('image tag state rejects conflicting digests', () => {
  assert.throws(
    () => resolveImageTagState({ versionDigest: 'sha256:one', shaDigest: 'sha256:two' }),
    /conflicting image tags/,
  );
});

test('image tag state recovers when the SHA tag is missing', () => {
  assert.deepEqual(
    resolveImageTagState({ versionDigest: 'sha256:one', shaDigest: '' }),
    { exists: true, digest: 'sha256:one', missingVersionTag: false, missingShaTag: true },
  );
});

test('image tag state recovers when the version tag is missing', () => {
  assert.deepEqual(
    resolveImageTagState({ versionDigest: '', shaDigest: 'sha256:one' }),
    { exists: true, digest: 'sha256:one', missingVersionTag: true, missingShaTag: false },
  );
});

test('release input validation accepts known service metadata', () => {
  assert.doesNotThrow(() => validateReleaseInputs({
    service: 'auth-service',
    version: '1.2.3',
    sourceRevision: '0123456789abcdef0123456789abcdef01234567',
    imageRepository: 'ghcr.io/owner/repo/auth-service',
  }));
});

test('release input validation rejects uppercase GHCR image repositories', () => {
  assert.throws(
    () => validateReleaseInputs({
      service: 'auth-service',
      version: '1.2.3',
      sourceRevision: '0123456789abcdef0123456789abcdef01234567',
      imageRepository: 'ghcr.io/Tres7/projet-archi-to-do-list/auth-service',
    }),
    /Invalid GHCR image repository/,
  );
});

test('release input validation rejects unknown services', () => {
  assert.throws(
    () => validateReleaseInputs({
      service: 'server-common',
      version: '1.2.3',
      sourceRevision: '0123456789abcdef0123456789abcdef01234567',
      imageRepository: 'ghcr.io/owner/repo/server-common',
    }),
    /Invalid service/,
  );
});

test('release input validation rejects pathological SemVer-like versions', () => {
  assert.throws(
    () => validateReleaseInputs({
      service: 'auth-service',
      version: `0.0.0-0.${'-.'.repeat(2000)}`,
      sourceRevision: '0123456789abcdef0123456789abcdef01234567',
      imageRepository: 'ghcr.io/owner/repo/auth-service',
    }),
    /Invalid SemVer version/,
  );
});
