import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  affectedServiceConfigs,
  changedFilesBetween,
  lowerGhcrImageRoot,
  normalizePath,
  serviceMatrix,
  splitFiles,
  verifyRevision,
  versionedServiceMatrix,
} from './services.mjs';

const defaultRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

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

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

const documentationPatterns = [
  /^README\.md$/,
  /^AGENTS\.md$/,
  /^docs\//,
  /^client\/README\.md$/,
  /^server\/\.changeset\/README\.md$/,
  /^client\/\.changeset\/README\.md$/,
];

const testPatterns = [
  /^server\/spec\//,
  /^server\/apps\/[^/]+\/test\//,
  /^client\/e2e\//,
  /\.(spec|test)\.tsx?$/,
];

const backendPatterns = [
  /^server\/apps\//,
  /^server\/common\//,
  /^server\/spec\//,
  /^server\/types\//,
  /^server\/package\.json$/,
  /^server\/package-lock\.json$/,
  /^server\/eslint\.config\.js$/,
  /^server\/prettier\.config\.mjs$/,
  /^server\/\.dependency-cruiser\.cjs$/,
  /^server\/jest.*\.config\.mjs$/,
  /^server\/tsconfig.*\.json$/,
  /^Makefile$/,
];

const backendRuntimePatterns = [
  /^server\/apps\/[^/]+\/src\//,
  /^server\/apps\/gateway\/index\.ts$/,
  /^server\/common\//,
  /^server\/types\//,
  /^server\/package\.json$/,
  /^server\/package-lock\.json$/,
  /^server\/tsconfig.*\.json$/,
  /^Makefile$/,
];

const backendLicensePatterns = [
  /^server\/package\.json$/,
  /^server\/package-lock\.json$/,
  /^server\/apps\/[^/]+\/package\.json$/,
  /^server\/common\/package\.json$/,
];

const clientPatterns = [
  /^client\/src\//,
  /^client\/e2e\//,
  /^client\/index\.html$/,
  /^client\/vite\.config\.ts$/,
  /^client\/package\.json$/,
  /^client\/package-lock\.json$/,
  /^client\/eslint\.config\.js$/,
  /^client\/playwright\.config\.js$/,
  /^client\/tsconfig.*\.json$/,
  /^Makefile$/,
];

const clientRuntimePatterns = [
  /^client\/src\//,
  /^client\/index\.html$/,
  /^client\/vite\.config\.ts$/,
  /^client\/package\.json$/,
  /^client\/package-lock\.json$/,
  /^client\/tsconfig.*\.json$/,
  /^Makefile$/,
];

const clientLicensePatterns = [
  /^client\/package\.json$/,
  /^client\/package-lock\.json$/,
];

const dockerPatterns = [
  /^compose\.ya?ml$/,
  /^compose\.prod\.ya?ml$/,
  /^server\/apps\/[^/]+\/Dockerfile$/,
  /^client\/Dockerfile$/,
  /^server\/\.dockerignore$/,
  /^client\/\.dockerignore$/,
  /^\.dockerignore$/,
  /^client\/nginx\.conf$/,
  /^\.github\/actions\/build-service-image\//,
  /^\.github\/scripts\/services\.mjs$/,
  /^\.github\/scripts\/ci-plan\.mjs$/,
  /^\.github\/workflows\/pr_main\.yml$/,
  /^\.github\/workflows\/pre_push_main\.yml$/,
];

const composePatterns = [
  /^compose\.ya?ml$/,
  /^compose\.prod\.ya?ml$/,
];

const manifestPatterns = [
  /^deploy\/manifests\//,
  /^deploy\/compose\//,
  /^compose\.prod\.ya?ml$/,
  /^\.github\/scripts\/manifest\.mjs$/,
  /^\.github\/scripts\/manifest\.test\.mjs$/,
  /^\.github\/scripts\/integration-release-plan\.mjs$/,
  /^\.github\/workflows\/pr_main\.yml$/,
  /^\.github\/workflows\/pre_push_main\.yml$/,
  /^\.github\/workflows\/release\.yml$/,
];

const backendCiPatterns = [
  /^\.github\/actions\/backend-checks\//,
  /^\.github\/actions\/setup-node-workspace\//,
  /^\.github\/actions\/upload-test-artifacts\//,
  /^\.github\/workflows\/pr_main\.yml$/,
];

const clientCiPatterns = [
  /^\.github\/actions\/client-checks\//,
  /^\.github\/actions\/setup-node-workspace\//,
  /^\.github\/workflows\/pr_main\.yml$/,
];

function bool(value) {
  return value ? 'true' : 'false';
}

function allFilesMatch(files, patterns) {
  return files.length > 0 && files.every((filePath) => matchesAny(filePath, patterns));
}

function anyFileMatches(files, patterns) {
  return files.some((filePath) => matchesAny(filePath, patterns));
}

function requiredBackendPackages(files) {
  const required = new Set();
  const affectedConfigs = affectedServiceConfigs(files, { includeCiChanges: false });

  for (const config of affectedConfigs) {
    if (config.service !== 'client') {
      required.add(config.packageName);
    }
  }

  for (const filePath of files) {
    if (/^server\/common\//.test(filePath) && filePath !== 'server/common/CHANGELOG.md') {
      required.add('@app/common');
    }
  }

  return [...required].sort();
}

function clientChangesetRequired(files) {
  return affectedServiceConfigs(files, { includeCiChanges: false })
    .some((config) => config.service === 'client');
}

function writeGithubOutput(filePath, output) {
  const lines = [];

  for (const [key, value] of Object.entries(output)) {
    if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${key}<<EOF`, value, 'EOF');
    } else {
      lines.push(`${key}=${value}`);
    }
  }

  fs.appendFileSync(filePath, `${lines.join('\n')}\n`);
}

function markdownSummary({ files, dockerMatrix, serviceMatrix: publishMatrix }) {
  const lines = [
    '## CI plan',
    '',
    `Changed files: ${files.length}`,
    '',
    '| scope | count |',
    '| --- | ---: |',
    `| PR Docker service checks | ${dockerMatrix.include.length} |`,
    `| Main publish services | ${publishMatrix.include.length} |`,
    '',
  ];

  if (publishMatrix.include.length > 0) {
    lines.push('Services to publish on main:', '');
    for (const item of publishMatrix.include) {
      lines.push(`- ${item.service} ${item.version}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function createPlan({
  changedFiles,
  repositoryRoot = defaultRoot,
  repositoryName = process.env.GITHUB_REPOSITORY || '',
}) {
  const files = changedFiles.map((filePath) => normalizePath(filePath, repositoryRoot)).sort();
  const dockerMatrix = serviceMatrix(files, { includeCiChanges: true, repositoryRoot });
  const publishMatrix = versionedServiceMatrix(files, { repositoryRoot });
  const backendRequiredPackages = requiredBackendPackages(files);

  return {
    changed_files: JSON.stringify(files),
    docs_only: bool(allFilesMatch(files, documentationPatterns)),
    tests_only: bool(allFilesMatch(files, testPatterns)),
    backend_required_packages: backendRequiredPackages.join('\n'),
    client_changeset_required: bool(clientChangesetRequired(files)),
    backend_quality: bool(anyFileMatches(files, [...backendPatterns, ...backendCiPatterns])),
    backend_integration: bool(anyFileMatches(files, [...backendRuntimePatterns, ...testPatterns, ...backendCiPatterns])),
    backend_license: bool(anyFileMatches(files, backendLicensePatterns)),
    client_quality: bool(anyFileMatches(files, [...clientPatterns, ...clientCiPatterns])),
    client_e2e: bool(anyFileMatches(files, [...clientRuntimePatterns, ...testPatterns, ...clientCiPatterns])),
    client_license: bool(anyFileMatches(files, clientLicensePatterns)),
    docker_checks: bool(anyFileMatches(files, dockerPatterns) || dockerMatrix.include.length > 0),
    docker_compose: bool(anyFileMatches(files, composePatterns)),
    docker_count: String(dockerMatrix.include.length),
    docker_matrix: JSON.stringify(dockerMatrix),
    service_count: String(publishMatrix.include.length),
    service_matrix: JSON.stringify(publishMatrix),
    manifest_checks: bool(anyFileMatches(files, manifestPatterns)),
    image_root: repositoryName ? lowerGhcrImageRoot(repositoryName) : '',
  };
}

function changedFilesFromOptions(options, repositoryRoot) {
  if (options['changed-files']) {
    return splitFiles(options['changed-files'], repositoryRoot);
  }

  const base = verifyRevision('base', options.base, repositoryRoot);
  const head = verifyRevision('head', options.head || 'HEAD', repositoryRoot);
  return changedFilesBetween({ base, head, repositoryRoot });
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repositoryRoot = process.env.REPOSITORY_ROOT || process.env.GITHUB_WORKSPACE || process.cwd();
  const files = changedFilesFromOptions(options, repositoryRoot);
  const plan = createPlan({
    changedFiles: files,
    repositoryRoot,
    repositoryName: options.repository || process.env.GITHUB_REPOSITORY || '',
  });

  if (options['github-output']) {
    writeGithubOutput(path.resolve(repositoryRoot, options['github-output']), plan);
  }

  if (options['summary-file']) {
    fs.writeFileSync(path.resolve(repositoryRoot, options['summary-file']), markdownSummary({
      files,
      dockerMatrix: JSON.parse(plan.docker_matrix),
      serviceMatrix: JSON.parse(plan.service_matrix),
    }));
  }

  console.log(JSON.stringify(plan, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
