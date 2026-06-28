import { defaultRoot, defaultSchemaPath } from './config.mjs';
import { entryFromOptions, entriesFromMetadataDir } from './metadata.mjs';
import { validateManifestFile } from './validate.mjs';
import { createVersionedManifest, latestManifest, updateManifest } from './update.mjs';
import { promoteServices } from './promote.mjs';
import {
  listImages,
  renderComposeEnv,
  renderComposeFile,
  validateComposeConfig,
  verifyComposeFile,
} from './compose.mjs';

export function parseArgs(argv) {
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

export function usage() {
  return `Usage:
  node .github/scripts/manifest.mjs validate <manifest>
  node .github/scripts/manifest.mjs update --manifest <path> --service <service> --version <semver> --revision <sha> --image <ghcr-ref>
  node .github/scripts/manifest.mjs update --manifest <path> --metadata-dir <dir> [--summary-file <path>] [--github-output <path>]
  node .github/scripts/manifest.mjs create-version --metadata-dir <dir> [--manifest-dir <dir>] [--base-manifest <path>] [--summary-file <path>] [--github-output <path>]
  node .github/scripts/manifest.mjs latest [--manifest-dir <dir>] [--version <semver>] [--github-output <path>]
  node .github/scripts/manifest.mjs render-compose-env --manifest <path> --output <file>
  node .github/scripts/manifest.mjs render-compose --manifest <path> --output <file> [--template <compose.prod.yml>]
  node .github/scripts/manifest.mjs verify-compose --manifest <path> --compose <file>
  node .github/scripts/manifest.mjs validate-compose --manifest <path> --output <file>
  node .github/scripts/manifest.mjs list-images --manifest <path> [--github-output <path>]

Manifests must use schemaVersion 1, contain all runtime services, and pin GHCR images with @sha256 digests.`;
}

function commonOptions(options) {
  return {
    repositoryRoot: process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd(),
    schemaPath: options.schema || defaultSchemaPath,
  };
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return;
  }

  const [command, ...rest] = argv;
  const { options, positional } = parseArgs(rest);
  const common = commonOptions(options);

  if (command === 'validate') {
    const manifestPath = options.manifest || positional[0];
    if (!manifestPath) {
      throw new Error('validate requires a manifest path.');
    }
    validateManifestFile(manifestPath, common);
    console.log(`Validated ${manifestPath}.`);
    return;
  }

  if (command === 'update') {
    const updates = options['metadata-dir']
      ? entriesFromMetadataDir(options['metadata-dir'], common.repositoryRoot)
      : entryFromOptions(options);
    const result = updateManifest({
      manifestPath: options.manifest,
      updates,
      summaryFile: options['summary-file'],
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(result.summary.trimEnd());
    return;
  }

  if (command === 'create-version') {
    const result = createVersionedManifest({
      metadataDir: options['metadata-dir'],
      manifestDir: options['manifest-dir'] || 'deploy/manifests',
      baseManifestPath: options['base-manifest'],
      summaryFile: options['summary-file'],
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(result.summary.trimEnd());
    return;
  }

  if (command === 'latest') {
    const result = latestManifest({
      manifestDir: options['manifest-dir'] || 'deploy/manifests',
      version: options.version,
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(`${result.version} ${result.manifestPath}`);
    return;
  }

  if (command === 'promote') {
    const result = promoteServices({
      services: String(options.service || '').split(',').filter(Boolean),
      fromPath: options.from,
      toPath: options.to,
      summaryFile: options['summary-file'],
      githubOutput: options['github-output'],
      ...common,
    });
    console.log(result.summary.trimEnd());
    return;
  }

  if (command === 'render-compose-env') {
    const lines = renderComposeEnv({ manifestPath: options.manifest, outputPath: options.output, ...common });
    console.log(`Wrote ${lines.length} image refs to ${options.output}.`);
    return;
  }

  if (command === 'render-compose') {
    renderComposeFile({
      manifestPath: options.manifest,
      outputPath: options.output,
      templatePath: options.template || 'compose.prod.yml',
      ...common,
    });
    console.log(`Rendered Compose file ${options.output} from ${options.manifest}.`);
    return;
  }

  if (command === 'verify-compose') {
    verifyComposeFile({ manifestPath: options.manifest, composePath: options.compose, ...common });
    console.log(`Verified ${options.compose} against ${options.manifest}.`);
    return;
  }

  if (command === 'validate-compose') {
    validateComposeConfig({ manifestPath: options.manifest, outputPath: options.output, ...common });
    console.log(`Validated Compose config for ${options.manifest}.`);
    return;
  }

  if (command === 'list-images') {
    const images = listImages({ manifestPath: options.manifest, githubOutput: options['github-output'], ...common });
    console.log(JSON.stringify(images, null, 2));
    return;
  }

  throw new Error(`Unknown command '${command}'.\n${usage()}`);
}
