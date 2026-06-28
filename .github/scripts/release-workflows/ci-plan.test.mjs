import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPlan } from '../ci-plan.mjs';
import { changedFilesBetween } from '../services.mjs';
import { actionFiles, commitAll, git, readJson, readYaml, root, workflowFiles } from './helpers.mjs';

test('active workflow surface is reduced to the common entrypoints', () => {
  assert.deepEqual(workflowFiles(), [
    '_deploy-compose.yml',
    '_main-finalize-tags.yml',
    '_main-plan.yml',
    '_main-publish-manifest.yml',
    '_main-push-image.yml',
    '_main-verify-image.yml',
    '_main-version-packages.yml',
    '_pr-app-checks.yml',
    '_pr-docker-checks.yml',
    '_pr-security.yml',
    'deploy-integration.yml',
    'nightly.yml',
    'pr_main.yml',
    'pre_push_main.yml',
    'release.yml',
  ]);
});

test('server/common runtime changes affect real common consumers', () => {
  const consumers = ['auth-service', 'project-service', 'task-service', 'notification-service', 'gateway'];
  const consumerPackages = consumers.map((service) => readJson(`server/apps/${service}/package.json`));
  const commonVersion = readJson('server/common/package.json').version;
  const plan = createPlan({
    changedFiles: ['server/common/messaging/MessageBus.ts'],
    repositoryRoot: root,
    repositoryName: 'Tres7/projet-archi-to-do-list',
  });

  assert.deepEqual(consumerPackages.map((pkg) => pkg.name), [
    '@app/auth-service',
    '@app/project-service',
    '@app/task-service',
    '@app/notification-service',
    '@app/gateway',
  ]);
  for (const pkg of consumerPackages) {
    assert.equal(pkg.dependencies['@app/common'], commonVersion);
  }
  assert.deepEqual(JSON.parse(plan.docker_matrix).include.map((item) => item.service), consumers);
  assert.deepEqual(JSON.parse(plan.service_matrix).include, []);
  assert.deepEqual(plan.backend_required_packages.split(/\n/).filter(Boolean), [
    '@app/auth-service',
    '@app/common',
    '@app/gateway',
    '@app/notification-service',
    '@app/project-service',
    '@app/task-service',
  ]);
});

test('CI plan requires changesets for publishable runtime image inputs', () => {
  const options = { repositoryRoot: root, repositoryName: 'Tres7/projet-archi-to-do-list' };
  const authDocker = createPlan({ changedFiles: ['server/apps/auth-service/Dockerfile'], ...options });
  const serverTypes = createPlan({ changedFiles: ['server/types/express/index.d.ts'], ...options });
  const clientDocker = createPlan({ changedFiles: ['client/Dockerfile'], ...options });
  const commonChangelog = createPlan({ changedFiles: ['server/common/CHANGELOG.md'], ...options });
  const workflowOnly = createPlan({ changedFiles: ['.github/workflows/pr_main.yml'], ...options });

  assert.equal(authDocker.backend_required_packages, '@app/auth-service');
  assert.deepEqual(JSON.parse(authDocker.docker_matrix).include.map((item) => item.service), ['auth-service']);
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
  const options = { repositoryRoot: root, repositoryName: 'Tres7/projet-archi-to-do-list' };
  const runtimeChange = createPlan({ changedFiles: ['server/apps/auth-service/src/app.ts'], ...options });
  const versionChange = createPlan({
    changedFiles: [
      'server/apps/auth-service/package.json',
      'server/apps/auth-service/CHANGELOG.md',
      'client/package.json',
      'client/CHANGELOG.md',
    ],
    ...options,
  });

  assert.deepEqual(JSON.parse(runtimeChange.service_matrix).include, []);
  assert.deepEqual(JSON.parse(versionChange.service_matrix).include.map((item) => item.service), ['auth-service', 'client']);
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

    assert.deepEqual(changedFilesBetween({ base: mainHead, head: featureHead, repositoryRoot }), ['.github/workflows/pr_main.yml']);
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
    }
  }
});
