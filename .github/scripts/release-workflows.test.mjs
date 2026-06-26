import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createPlan } from './ci-plan.mjs';
import { changedFilesBetween } from './services.mjs';

const require = createRequire(import.meta.url);
const yaml = require('../../server/node_modules/js-yaml');
const root = path.resolve(new URL('../..', import.meta.url).pathname);

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function commitAll(cwd, message) {
  git(['add', '.'], cwd);
  git(['-c', 'user.name=CI', '-c', 'user.email=ci@example.com', 'commit', '-m', message], cwd);
  return git(['rev-parse', 'HEAD'], cwd);
}

function assertDependabotSkipGuard(condition) {
  const expression = String(condition);

  assert.match(expression, /github\.actor != 'dependabot\[bot\]'/);
  assert.match(expression, /head_commit\.author\.username != 'dependabot\[bot\]'/);
  assert.match(expression, /head_commit\.committer\.username != 'dependabot\[bot\]'/);
  assert.match(expression, /contains\(github\.event\.head_commit\.message, 'dependabot\/'\) == false/);
}

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

function workflowFiles() {
  return fs.readdirSync(path.join(root, '.github/workflows'))
    .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
    .sort();
}

function actionFiles() {
  return fs.readdirSync(path.join(root, '.github/actions'))
    .map((directory) => `.github/actions/${directory}/action.yml`)
    .filter((filePath) => fs.existsSync(path.join(root, filePath)))
    .sort();
}

test('active workflow surface is reduced to the common entrypoints', () => {
  assert.deepEqual(workflowFiles(), [
    'nightly.yml',
    'pr_main.yml',
    'pre_push_main.yml',
    'release.yml',
  ]);
});

test('server/common runtime changes affect real common consumers and not gateway', () => {
  const consumers = ['auth-service', 'project-service', 'task-service', 'notification-service'];
  const consumerPackages = consumers.map((service) => readJson(`server/apps/${service}/package.json`));
  const commonVersion = readJson('server/common/package.json').version;
  const plan = createPlan({
    changedFiles: ['server/common/messaging/MessageBus.ts'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const dockerMatrix = JSON.parse(plan.docker_matrix);
  const serviceMatrix = JSON.parse(plan.service_matrix);

  assert.deepEqual(
    consumerPackages.map((pkg) => pkg.name),
    ['@app/auth-service', '@app/project-service', '@app/task-service', '@app/notification-service'],
  );

  for (const pkg of consumerPackages) {
    assert.equal(pkg.dependencies['@app/common'], commonVersion);
  }

  assert.equal(readJson('server/apps/gateway/package.json').dependencies['@app/common'], undefined);
  assert.deepEqual(
    dockerMatrix.include.map((item) => item.service),
    consumers,
  );
  assert.deepEqual(serviceMatrix.include, []);
  assert.deepEqual(plan.backend_required_packages.split(/\n/).filter(Boolean), [
    '@app/auth-service',
    '@app/common',
    '@app/notification-service',
    '@app/project-service',
    '@app/task-service',
  ]);
  assert.equal(plan.backend_required_packages.includes('@app/gateway'), false);
});

test('CI plan requires changesets for publishable runtime image inputs', () => {
  const authDocker = createPlan({
    changedFiles: ['server/apps/auth-service/Dockerfile'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const serverTypes = createPlan({
    changedFiles: ['server/types/express/index.d.ts'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const clientDocker = createPlan({
    changedFiles: ['client/Dockerfile'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const commonChangelog = createPlan({
    changedFiles: ['server/common/CHANGELOG.md'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const workflowOnly = createPlan({
    changedFiles: ['.github/workflows/pr_main.yml'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });

  assert.equal(authDocker.backend_required_packages, '@app/auth-service');
  assert.deepEqual(
    JSON.parse(authDocker.docker_matrix).include.map((item) => item.service),
    ['auth-service'],
  );
  assert.deepEqual(serverTypes.backend_required_packages.split(/\n/).filter(Boolean), [
    '@app/auth-service',
    '@app/gateway',
    '@app/notification-service',
    '@app/project-service',
    '@app/task-service',
  ]);
  assert.equal(clientDocker.client_changeset_required, 'true');
  assert.equal(commonChangelog.backend_required_packages, '');
  assert.equal(workflowOnly.docker_checks, 'false');
  assert.equal(workflowOnly.docker_count, '0');
  assert.deepEqual(JSON.parse(workflowOnly.docker_matrix).include, []);
});

test('main publish matrix is driven by versioned package manifests', () => {
  const runtimeChange = createPlan({
    changedFiles: ['server/apps/auth-service/src/app.ts'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });
  const versionChange = createPlan({
    changedFiles: [
      'server/apps/auth-service/package.json',
      'server/apps/auth-service/CHANGELOG.md',
      'client/package.json',
      'client/CHANGELOG.md',
    ],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });

  assert.deepEqual(JSON.parse(runtimeChange.service_matrix).include, []);
  assert.deepEqual(
    JSON.parse(versionChange.service_matrix).include.map((item) => item.service),
    ['auth-service', 'client'],
  );
});

test('PR workflow uses actions instead of reusable workflow files', () => {
  const workflow = readYaml('.github/workflows/pr_main.yml');

  assert.equal(workflow.jobs['backend-checks'].steps.at(-1).uses, './.github/actions/backend-checks');
  assert.equal(workflow.jobs['client-checks'].steps.at(-1).uses, './.github/actions/client-checks');
  assert.equal(
    workflow.jobs['docker-services'].steps.find((step) => step.name === 'Build image without pushing').uses,
    './.github/actions/build-service-image',
  );
  assert.equal(workflow.jobs['docker-services'].strategy['max-parallel'], undefined);
  assert.equal(workflow.jobs.changes.steps.find((step) => step.id === 'plan').uses, './.github/actions/detect-ci-plan');
});

test('PR workflow skips expensive checks for automated Version Packages PRs', () => {
  const workflow = readYaml('.github/workflows/pr_main.yml');
  const versionBranchGuard = /github\.event\.pull_request\.head\.ref != 'changesets\/version-packages'/;
  const guardedJobs = [
    'changes',
    'changesets',
    'backend-checks',
    'client-checks',
    'docker-compose',
    'docker-services',
    'manifest-checks',
    'codeql',
    'gitleaks',
  ];

  for (const jobName of guardedJobs) {
    assert.match(String(workflow.jobs[jobName].if), versionBranchGuard, `${jobName} should skip Version Packages PRs`);
  }

  const prStatus = workflow.jobs['pr-status'];
  assert.equal(prStatus.if, 'always()');
  assert.match(
    prStatus.steps.find((step) => step.name === 'Report skipped automated Version PR').run,
    /regular PR checks intentionally skipped/,
  );
  assert.match(
    String(prStatus.steps.find((step) => step.name === 'Fail on failed required checks').if),
    versionBranchGuard,
  );
});

test('Dependabot updates only on schedule and does not rebase on every main push', () => {
  const config = readYaml('.github/dependabot.yml');

  for (const update of config.updates) {
    assert.equal(update['target-branch'], 'main');
    assert.equal(update['rebase-strategy'], 'disabled');
    assert.equal(update.schedule.interval, 'weekly');
  }
});

test('Docker image action uses registry cache and does not write PR cache by default', () => {
  const action = readYaml('.github/actions/build-service-image/action.yml');
  const tagsStep = action.runs.steps.find((step) => step.id === 'tags');
  const buildStep = action.runs.steps.find((step) => step.id === 'build');

  assert.equal(buildStep.with['cache-from'], 'type=registry,ref=${{ inputs.image-repository }}:buildcache');
  assert.match(buildStep.with['cache-to'], /mode=min/);
  assert.match(buildStep.with['cache-to'], /inputs\.push == 'true'/);
  assert.equal(buildStep.with.tags, '${{ steps.tags.outputs.tags }}');
  assert.equal(buildStep.with.load, '${{ inputs.load }}');
  assert.match(tagsStep.run, /TAG_MODE/);
  assert.match(tagsStep.run, /candidate-tag is required/);
  assert.equal(action.inputs.push.default, 'false');
  assert.equal(action.inputs.load.default, 'false');
  assert.equal(action.inputs['tag-mode'].default, 'release');
  assert.equal(action.outputs.version_tag.value, '${{ steps.result.outputs.version_tag }}');
  assert.equal(action.outputs.candidate_ref.value, '${{ steps.result.outputs.candidate_ref }}');
});

test('CI plan action can use explicit changed files without a git diff', () => {
  const action = readYaml('.github/actions/detect-ci-plan/action.yml');
  const planStep = action.runs.steps.find((step) => step.id === 'plan');

  assert.equal(action.inputs.base.required, false);
  assert.equal(action.inputs.head.required, false);
  assert.equal(action.inputs['changed-files'].required, false);
  assert.match(planStep.run, /--changed-files/);
  assert.match(planStep.run, /--base "\$BASE_REVISION" --head "\$HEAD_REVISION"/);
});

test('changed files use the merge base when a PR branch is behind main', () => {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-plan-merge-base-'));

  try {
    git(['init'], repositoryRoot);
    git(['checkout', '-b', 'main'], repositoryRoot);

    fs.writeFileSync(path.join(repositoryRoot, 'README.md'), 'base\n');
    commitAll(repositoryRoot, 'base');

    git(['checkout', '-b', 'feature'], repositoryRoot);
    fs.mkdirSync(path.join(repositoryRoot, '.github/workflows'), { recursive: true });
    fs.writeFileSync(path.join(repositoryRoot, '.github/workflows/pr_main.yml'), 'name: PR Main\n');
    const featureHead = commitAll(repositoryRoot, 'feature workflow');

    git(['checkout', 'main'], repositoryRoot);
    fs.mkdirSync(path.join(repositoryRoot, 'server/apps/auth-service'), { recursive: true });
    fs.writeFileSync(path.join(repositoryRoot, 'server/apps/auth-service/package.json'), '{"name":"@app/auth-service"}\n');
    const mainHead = commitAll(repositoryRoot, 'version package');

    assert.deepEqual(
      changedFilesBetween({ base: mainHead, head: featureHead, repositoryRoot }),
      ['.github/workflows/pr_main.yml'],
    );
  } finally {
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
  }
});

test('actions include schema-friendly metadata', () => {
  for (const filePath of actionFiles()) {
    const action = readYaml(filePath);

    assert.ok(action.name, `${filePath} should include a name`);
    assert.ok(action.description, `${filePath} should include a description`);
    assert.equal(action.runs?.using, 'composite', `${filePath} should be a composite action`);
    assert.ok(Array.isArray(action.runs?.steps), `${filePath} should include composite steps`);

    for (const [inputId, input] of Object.entries(action.inputs || {})) {
      assert.match(inputId, /^[A-Za-z_][A-Za-z0-9_-]*$/, `${filePath} has invalid input id '${inputId}'`);
      assert.ok(input.description, `${filePath} input '${inputId}' should include a description`);
      assert.equal(typeof input.required, 'boolean', `${filePath} input '${inputId}' should define required as a boolean`);
      if (input.default !== undefined) {
        assert.equal(typeof input.default, 'string', `${filePath} input '${inputId}' default should be a string`);
      }
    }

    for (const [outputId, output] of Object.entries(action.outputs || {})) {
      assert.match(outputId, /^[A-Za-z_][A-Za-z0-9_-]*$/, `${filePath} has invalid output id '${outputId}'`);
      assert.ok(output.description, `${filePath} output '${outputId}' should include a description`);
      assert.equal(typeof output.value, 'string', `${filePath} output '${outputId}' should include a string value`);
    }

    for (const [index, step] of action.runs.steps.entries()) {
      const stepName = `${filePath} step ${index + 1}${step.name ? ` (${step.name})` : ''}`;

      assert.ok(step.name, `${stepName} should include a name`);
      assert.ok(step.run || step.uses, `${stepName} should include run or uses`);
      assert.ok(!(step.run && step.uses), `${stepName} should not include both run and uses`);
      if (step.run) {
        assert.ok(step.shell, `${stepName} run step should include a shell`);
      }

      for (const [key, value] of Object.entries(step.with || {})) {
        assert.equal(typeof value, 'string', `${stepName} with.${key} should be a string`);
      }
    }
  }
});

test('protected main push workflow verifies, pushes, then publishes integration manifest', () => {
  const workflow = readYaml('.github/workflows/pre_push_main.yml');
  const workflowContent = fs.readFileSync(path.join(root, '.github/workflows/pre_push_main.yml'), 'utf8');
  const plan = workflow.jobs.plan;
  const verify = workflow.jobs['verify-images'];
  const push = workflow.jobs['push-images'];
  const update = workflow.jobs['update-integration'];
  const finalize = workflow.jobs['finalize-image-tags'];
  const versionPackages = workflow.jobs['version-packages'];
  const planCheckout = plan.steps.find((step) => step.name === 'Checkout');
  const planStep = plan.steps.find((step) => step.id === 'plan');
  const releaseVersionStep = plan.steps.find((step) => step.name === 'Validate integration release versions');
  const verifyCheckout = verify.steps.find((step) => step.name === 'Checkout');
  const updateCheckout = update.steps.find((step) => step.name === 'Checkout');
  const verifyImageStep = verify.steps.find((step) => step.id === 'image');
  const smokeStep = verify.steps.find((step) => step.id === 'smoke');
  const trivyStep = verify.steps.find((step) => step.id === 'trivy');
  const saveImageStep = verify.steps.find((step) => step.id === 'save_image');
  const pushCandidateStep = push.steps.find((step) => step.id === 'push_candidate');
  const renderStep = update.steps.find((step) => step.name === 'Render integration Compose');
  const prStep = update.steps.find((step) => step.name === 'Create or update integration deployment PR');
  const publishResultStep = update.steps.find((step) => step.id === 'publish_result');
  const finalTagsStep = finalize.steps.find((step) => step.id === 'final_tags');
  const reportStep = update.steps.find((step) => step.name === 'Report integration deployment PR');

  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.on.pull_request_target, undefined);
  assertDependabotSkipGuard(plan.if);
  assertDependabotSkipGuard(versionPackages.if);
  assert.equal(planCheckout.with.ref, undefined);
  assert.equal(plan.permissions['pull-requests'], undefined);
  assert.equal(planStep.with.base, '${{ steps.revisions.outputs.base }}');
  assert.equal(planStep.with.head, '${{ steps.revisions.outputs.head }}');
  assert.match(releaseVersionStep.run, /integration-release-plan\.mjs/);
  assert.match(releaseVersionStep.run, /deploy\/manifests\/integration\.yaml/);
  assert.equal(verify.if, "${{ needs.plan.outputs.service_count != '0' }}");
  assert.equal(verify.strategy.matrix, '${{ fromJson(needs.plan.outputs.service_matrix) }}');
  assert.equal(verify.strategy['max-parallel'], undefined);
  assert.equal(verifyCheckout.with.ref, '${{ github.sha }}');
  assert.equal(verifyImageStep.uses, './.github/actions/build-service-image');
  assert.equal(verifyImageStep.with['source-revision'], '${{ github.sha }}');
  assert.equal(verifyImageStep.with['tag-mode'], 'candidate');
  assert.equal(verifyImageStep.with.push, 'false');
  assert.equal(verifyImageStep.with.load, 'true');
  assert.match(smokeStep.run, /--add-host gateway:127\.0\.0\.1/);
  assert.match(smokeStep.run, /--entrypoint nginx/);
  assert.equal(trivyStep.with['image-ref'], '${{ steps.image.outputs.candidate_ref }}');
  assert.match(saveImageStep.run, /docker save/);
  assert.match(saveImageStep.run, /gzip/);
  assert.deepEqual(push.needs, ['plan', 'verify-images']);
  assert.match(push.if, /needs\.verify-images\.result == 'success'/);
  assert.equal(push.strategy.matrix, '${{ fromJson(needs.plan.outputs.service_matrix) }}');
  assert.equal(push.strategy['max-parallel'], undefined);
  assert.match(pushCandidateStep.run, /docker load/);
  assert.match(pushCandidateStep.run, /docker push "\$candidate_ref"/);
  assert.match(pushCandidateStep.run, /release-metadata\/metadata\.json/);
  assert.deepEqual(update.needs, ['plan', 'push-images']);
  assert.match(update.if, /needs\.push-images\.result == 'success'/);
  assert.equal(update.outputs.manifest_published, '${{ steps.publish_result.outputs.published }}');
  assert.equal(update.permissions['pull-requests'], 'write');
  assert.equal(updateCheckout.with.ref, 'main');
  assert.equal(updateCheckout.with.token, '${{ secrets.MANIFEST_UPDATE_TOKEN || github.token }}');
  assert.match(renderStep.run, /manifest\.mjs render-compose/);
  assert.match(renderStep.run, /deploy\/compose\/integration\.yml/);
  assert.equal(prStep.uses, 'peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1');
  assert.equal(prStep.with.token, '${{ secrets.MANIFEST_UPDATE_TOKEN || github.token }}');
  assert.equal(prStep.with.branch, 'deploy-update-integration');
  assert.equal(prStep.with.base, 'main');
  assert.equal(prStep.with.title, 'chore(deploy): update integration deployment');
  assert.equal(prStep.with['commit-message'], 'chore(deploy): update integration deployment');
  assert.equal(prStep.with['body-path'], 'integration-deployment-summary.md');
  assert.match(prStep.with['add-paths'], /deploy\/manifests\/integration\.yaml/);
  assert.match(prStep.with['add-paths'], /deploy\/compose\/integration\.yml/);
  assert.equal(prStep.with['delete-branch'], false);
  assert.match(publishResultStep.run, /published=true/);
  assert.deepEqual(finalize.needs, ['plan', 'push-images', 'update-integration']);
  assert.match(finalize.if, /manifest_published == 'true'/);
  assert.match(finalTagsStep.run, /imagetools create/);
  assert.match(finalTagsStep.run, /Version tag .* already points/);
  assert.match(reportStep.run, /integration-deployment-summary\.md/);
  assert.doesNotMatch(workflowContent, /git push origin HEAD:main/);
  assert.doesNotMatch(workflowContent, /needs\.verify-images\.result != 'success'[\s\S]*docker push/);
});

test('manual release promotes integration to production manifest and compose', () => {
  const workflow = readYaml('.github/workflows/release.yml');
  const job = workflow.jobs['promote-production'];
  const prepareBranchStep = job.steps.find((step) => step.name === 'Prepare promotion branch');
  const promoteStep = job.steps.find((step) => step.name === 'Promote service entries');
  const renderStep = job.steps.find((step) => step.name === 'Render production Compose');
  const prStep = job.steps.find((step) => step.name === 'Create or update production promotion PR');

  assert.deepEqual(workflow.on.workflow_dispatch.inputs.service.options, [
    'all',
    'auth-service',
    'project-service',
    'task-service',
    'notification-service',
    'gateway',
    'client',
  ]);
  assert.equal(prepareBranchStep.with.branch, 'deploy-promote-production');
  assert.match(promoteStep.run, /manifest\.mjs promote/);
  assert.match(renderStep.run, /manifest\.mjs render-compose/);
  assert.match(renderStep.run, /deploy\/compose\/production\.yml/);
  assert.equal(prStep.with.branch, 'deploy-promote-production');
  assert.match(prStep.with['add-paths'], /deploy\/manifests\/production\.yaml/);
  assert.match(prStep.with['add-paths'], /deploy\/compose\/production\.yml/);
});

test('nightly combines npm audit, CodeQL, and production Trivy scans', () => {
  const workflow = readYaml('.github/workflows/nightly.yml');
  const content = fs.readFileSync(path.join(root, '.github/workflows/nightly.yml'), 'utf8');

  assert.equal(workflow.concurrency.group, 'nightly');
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert.ok(workflow.jobs.codeql);
  assert.ok(workflow.jobs['npm-audit']);
  assert.ok(workflow.jobs.trivy);
  assert.equal(workflow.jobs.trivy.strategy['max-parallel'], 1);
  assert.match(content, /manifest\.mjs list-images/);
  assert.equal(content.includes(':latest'), false);
  assert.equal(content.includes('${{ matrix.image }}'), true);
});

test('deployment workflows reuse manifest script for Compose validation', () => {
  for (const workflowPath of [
    '.github/workflows/pr_main.yml',
    '.github/workflows/pre_push_main.yml',
    '.github/workflows/release.yml',
  ]) {
    const content = fs.readFileSync(path.join(root, workflowPath), 'utf8');
    assert.match(content, /manifest\.mjs validate-compose/, `${workflowPath} should use validate-compose`);
    assert.equal(content.includes('docker compose --env-file'), false, `${workflowPath} should not duplicate compose config`);
  }
});

test('manifest branch helper validates branch inputs before git commands', () => {
  const action = readYaml('.github/actions/prepare-manifest-branch/action.yml');
  const script = action.runs.steps.find((step) => step.name === 'Prepare branch').run;

  assert.match(script, /Invalid manifest branch name/);
  assert.match(script, /Invalid base branch name/);
  assert.match(script, /\[\^A-Za-z0-9\._\/-\]/);
});
