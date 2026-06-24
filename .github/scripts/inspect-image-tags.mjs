import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidSemver } from './semver-utils.mjs';

const serviceIds = new Set([
  'auth-service',
  'project-service',
  'task-service',
  'notification-service',
  'gateway',
  'client',
]);

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

function normalizeDigest(value) {
  return String(value || '').trim();
}

export function validateReleaseInputs({ service, version, sourceRevision, imageRepository }) {
  if (!serviceIds.has(service)) {
    throw new Error(`Invalid service '${service}'.`);
  }

  if (!isValidSemver(version)) {
    throw new Error(`Invalid SemVer version '${version}'.`);
  }

  if (!/^[0-9a-f]{40}$/i.test(sourceRevision || '')) {
    throw new Error(`Invalid source revision '${sourceRevision}'. Expected a full Git SHA.`);
  }

  if (!/^ghcr\.io\/[a-z0-9][a-z0-9_.-]*(?:\/[a-z0-9][a-z0-9_.-]*)+$/.test(imageRepository || '')) {
    throw new Error(`Invalid GHCR image repository '${imageRepository}'.`);
  }
}

export function resolveImageTagState({ versionDigest, shaDigest, versionRef = 'version tag', shaRef = 'SHA tag' }) {
  const normalizedVersionDigest = normalizeDigest(versionDigest);
  const normalizedShaDigest = normalizeDigest(shaDigest);

  if (!normalizedVersionDigest && !normalizedShaDigest) {
    return { exists: false, digest: '', missingVersionTag: false, missingShaTag: false };
  }

  if (normalizedVersionDigest && !normalizedShaDigest) {
    return {
      exists: true,
      digest: normalizedVersionDigest,
      missingVersionTag: false,
      missingShaTag: true,
    };
  }

  if (!normalizedVersionDigest && normalizedShaDigest) {
    return {
      exists: true,
      digest: normalizedShaDigest,
      missingVersionTag: true,
      missingShaTag: false,
    };
  }

  if (normalizedVersionDigest !== normalizedShaDigest) {
    throw new Error(
      `Refusing conflicting image tags. ${versionRef} digest: ${normalizedVersionDigest}; ${shaRef} digest: ${normalizedShaDigest}.`,
    );
  }

  return { exists: true, digest: normalizedVersionDigest, missingVersionTag: false, missingShaTag: false };
}

function inspectDigest(ref) {
  let output;

  try {
    output = execFileSync('docker', ['buildx', 'imagetools', 'inspect', ref], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return '';
  }

  return output.match(/^Digest:\s+(\S+)$/m)?.[1] || '';
}

function appendGithubOutput(filePath, outputs) {
  fs.appendFileSync(
    filePath,
    `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const service = options.service;
  const version = options.version;
  const sourceRevision = options['source-revision'];
  const imageRepository = options['image-repository'];

  validateReleaseInputs({ service, version, sourceRevision, imageRepository });

  if (options['validate-only'] === 'true') {
    console.log(JSON.stringify({ valid: true }, null, 2));
    return;
  }

  const versionRef = `${imageRepository}:${version}`;
  const shaRef = `${imageRepository}:sha-${sourceRevision}`;
  const result = resolveImageTagState({
    versionDigest: inspectDigest(versionRef),
    shaDigest: inspectDigest(shaRef),
    versionRef,
    shaRef,
  });

  const outputs = {
    exists: String(result.exists),
    digest: result.digest,
    missing_version_tag: String(result.missingVersionTag),
    missing_sha_tag: String(result.missingShaTag),
    version_ref: versionRef,
    sha_ref: shaRef,
  };

  if (options['github-output']) {
    appendGithubOutput(path.resolve(options['github-output']), outputs);
  }

  console.log(JSON.stringify(outputs, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
