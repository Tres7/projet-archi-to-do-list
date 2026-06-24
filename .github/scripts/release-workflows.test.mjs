import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createPlan } from './ci-plan.mjs';

const require = createRequire(import.meta.url);
const yaml = require('../../server/node_modules/js-yaml');
const root = path.resolve(new URL('../..', import.meta.url).pathname);

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
    serviceMatrix.include.map((item) => item.service),
    consumers,
  );
  assert.equal(plan.backend_required_packages.includes('@app/gateway'), false);
});

test('PR workflow uses actions instead of reusable workflow files', () => {
  const workflow = readYaml('.github/workflows/pr_main.yml');

  assert.equal(workflow.jobs['backend-checks'].steps.at(-1).uses, './.github/actions/backend-checks');
  assert.equal(workflow.jobs['client-checks'].steps.at(-1).uses, './.github/actions/client-checks');
  assert.equal(
    workflow.jobs['docker-services'].steps.find((step) => step.name === 'Build image without pushing').uses,
    './.github/actions/build-service-image',
  );
  assert.equal(workflow.jobs.changes.steps.find((step) => step.id === 'plan').uses, './.github/actions/detect-ci-plan');
});

test('Docker image action uses registry cache and does not write PR cache by default', () => {
  const action = readYaml('.github/actions/build-service-image/action.yml');
  const buildStep = action.runs.steps.find((step) => step.id === 'build');

  assert.equal(buildStep.with['cache-from'], 'type=registry,ref=${{ inputs.image-repository }}:buildcache');
  assert.match(buildStep.with['cache-to'], /mode=min/);
  assert.match(buildStep.with['cache-to'], /inputs\.push == 'true'/);
  assert.match(buildStep.with.tags, /\$\{\{ inputs\.image-repository \}\}:\$\{\{ inputs\.version \}\}/);
  assert.equal(action.inputs.push.default, 'false');
  assert.equal(action.outputs.version_tag.value, '${{ steps.result.outputs.version_tag }}');
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

test('protected main push workflow publishes only changed services and opens integration deployment PR', () => {
  const workflow = readYaml('.github/workflows/pre_push_main.yml');
  const plan = workflow.jobs.plan;
  const publish = workflow.jobs['publish-images'];
  const update = workflow.jobs['update-integration'];
  const planCheckout = plan.steps.find((step) => step.name === 'Checkout');
  const planStep = plan.steps.find((step) => step.id === 'plan');
  const publishCheckout = publish.steps.find((step) => step.name === 'Checkout');
  const updateCheckout = update.steps.find((step) => step.name === 'Checkout');
  const imageStep = publish.steps.find((step) => step.id === 'image');
  const renderStep = update.steps.find((step) => step.name === 'Render integration Compose');
  const prStep = update.steps.find((step) => step.name === 'Create or update integration deployment PR');

  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.on.pull_request_target, undefined);
  assert.equal(plan.if, undefined);
  assert.equal(planCheckout.with.ref, undefined);
  assert.equal(plan.permissions['pull-requests'], undefined);
  assert.equal(update.permissions['pull-requests'], 'write');
  assert.equal(planStep.with.base, '${{ steps.revisions.outputs.base }}');
  assert.equal(planStep.with.head, '${{ steps.revisions.outputs.head }}');
  assert.equal(publish.if, "${{ needs.plan.outputs.service_count != '0' }}");
  assert.equal(publish.strategy.matrix, '${{ fromJson(needs.plan.outputs.service_matrix) }}');
  assert.equal(publishCheckout.with.ref, '${{ github.sha }}');
  assert.equal(updateCheckout.with.ref, 'main');
  assert.equal(updateCheckout.with.token, '${{ secrets.MANIFEST_UPDATE_TOKEN || github.token }}');
  assert.equal(imageStep.uses, './.github/actions/build-service-image');
  assert.equal(imageStep.with['source-revision'], '${{ github.sha }}');
  assert.match(renderStep.run, /manifest\.mjs render-compose/);
  assert.match(renderStep.run, /deploy\/compose\/integration\.yml/);
  assert.equal(prStep.uses, 'peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1');
  assert.equal(prStep.with.token, '${{ secrets.MANIFEST_UPDATE_TOKEN || github.token }}');
  assert.equal(prStep.with.branch, 'deploy/update-integration');
  assert.equal(prStep.with.base, 'main');
  assert.match(prStep.with['add-paths'], /deploy\/manifests\/integration\.yaml/);
  assert.match(prStep.with['add-paths'], /deploy\/compose\/integration\.yml/);
});

test('manual release promotes integration to production manifest and compose', () => {
  const workflow = readYaml('.github/workflows/release.yml');
  const job = workflow.jobs['promote-production'];
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
  assert.match(promoteStep.run, /manifest\.mjs promote/);
  assert.match(renderStep.run, /manifest\.mjs render-compose/);
  assert.match(renderStep.run, /deploy\/compose\/production\.yml/);
  assert.match(prStep.with['add-paths'], /deploy\/manifests\/production\.yaml/);
  assert.match(prStep.with['add-paths'], /deploy\/compose\/production\.yml/);
});

test('nightly combines npm audit, CodeQL, and production Trivy scans', () => {
  const workflow = readYaml('.github/workflows/nightly.yml');
  const content = fs.readFileSync(path.join(root, '.github/workflows/nightly.yml'), 'utf8');

  assert.ok(workflow.jobs.codeql);
  assert.ok(workflow.jobs['npm-audit']);
  assert.ok(workflow.jobs.trivy);
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
