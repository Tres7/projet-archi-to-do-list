import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('../../server/node_modules/js-yaml');
const root = path.resolve(new URL('../..', import.meta.url).pathname);

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

test('server/common runtime changes require all real common consumers and not gateway', () => {
  const filters = readYaml('.github/filters/pr-paths.yml');
  const consumers = ['auth-service', 'project-service', 'task-service', 'notification-service'];
  const consumerPackages = consumers.map((service) => readJson(`server/apps/${service}/package.json`));

  assert.deepEqual(
    consumerPackages.map((pkg) => pkg.name),
    ['@app/auth-service', '@app/project-service', '@app/task-service', '@app/notification-service'],
  );

  for (const pkg of consumerPackages) {
    assert.equal(pkg.dependencies['@app/common'], '1.0.0');
  }

  assert.equal(readJson('server/apps/gateway/package.json').dependencies['@app/common'], undefined);
  assert.deepEqual(filters.common_auth_runtime, ['server/common/**']);
  assert.deepEqual(filters.common_project_runtime, ['server/common/**']);
  assert.deepEqual(filters.common_task_runtime, ['server/common/**']);
  assert.deepEqual(filters.common_notification_runtime, ['server/common/**']);
});

test('reusable workflow exposes release outputs at workflow, job, and step levels', () => {
  const workflow = readYaml('.github/workflows/_build-ghcr-image.yml');
  const workflowOutputs = workflow.on.workflow_call.outputs;
  const jobOutputs = workflow.jobs.build.outputs;
  const resultStep = workflow.jobs.build.steps.find((step) => step.id === 'result');
  const outputNames = ['service', 'version', 'source_revision', 'digest', 'immutable_image_ref', 'version_tag', 'sha_tag'];

  for (const outputName of outputNames) {
    assert.ok(workflowOutputs[outputName], `missing workflow output ${outputName}`);
    assert.match(workflowOutputs[outputName].value, new RegExp(`jobs\\.build\\.outputs\\.${outputName}`));
    assert.equal(jobOutputs[outputName], `\${{ steps.result.outputs.${outputName} }}`);
    assert.match(resultStep.run, new RegExp(`${outputName}=`));
  }
});

test('reusable workflow uploads one small metadata artifact per service version', () => {
  const workflow = readYaml('.github/workflows/_build-ghcr-image.yml');
  const uploadStep = workflow.jobs.build.steps.find((step) => step.name === 'Upload release metadata');
  const writeStep = workflow.jobs.build.steps.find((step) => step.name === 'Write release metadata');

  assert.equal(uploadStep.uses, 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
  assert.equal(uploadStep.with.name, 'release-metadata-${{ inputs.service }}-${{ inputs.version }}');
  assert.equal(uploadStep.with.path, 'release-metadata/metadata.json');
  assert.match(writeStep.run, /sourceRevision/);
  assert.match(writeStep.run, /immutableImageRef|image/);
  assert.match(writeStep.run, /test\("\^sha256:/);
});

test('reusable workflow does not interpolate inputs directly inside run blocks', () => {
  const workflow = readYaml('.github/workflows/_build-ghcr-image.yml');

  for (const step of workflow.jobs.build.steps) {
    if (typeof step.run !== 'string') {
      continue;
    }

    assert.equal(
      step.run.includes('${{ inputs.'),
      false,
      `${step.name} interpolates workflow_call inputs directly inside run`,
    );
  }
});

test('legacy shared release and retag workflows are removed', () => {
  assert.equal(fs.existsSync(path.join(root, '.github/workflows/release-images.yml')), false);
  assert.equal(fs.existsSync(path.join(root, '.github/workflows/_retag-ghcr-image.yml')), false);
});

test('release-services updates integration manifest after successful service releases', () => {
  const workflow = readYaml('.github/workflows/release-services.yml');
  const job = workflow.jobs.update_integration_manifest;

  assert.equal(job.uses, './.github/workflows/_update-integration-manifest.yml');
  assert.match(job.if, /needs\.release_services\.result == 'success'/);
  assert.equal(job.permissions.contents, 'write');
  assert.equal(job.permissions['pull-requests'], 'write');
  assert.equal(job.permissions.actions, 'read');
});

test('integration manifest updater creates one PR from release metadata artifacts', () => {
  const workflow = readYaml('.github/workflows/_update-integration-manifest.yml');
  const steps = workflow.jobs.update.steps;
  const downloadStep = steps.find((step) => step.name === 'Download release metadata');
  const updateStep = steps.find((step) => step.name === 'Update integration manifest');
  const prStep = steps.find((step) => step.name === 'Create or update integration manifest PR');

  assert.equal(downloadStep.uses, 'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c');
  assert.equal(downloadStep.with.pattern, 'release-metadata-*');
  assert.match(updateStep.run, /manifest\.mjs update/);
  assert.match(updateStep.run, /--metadata-dir release-metadata/);
  assert.equal(prStep.uses, 'peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1');
  assert.equal(prStep.with.branch, 'deploy/update-integration');
  assert.equal(prStep.with['add-paths'], 'deploy/manifests/integration.yaml');
});

test('deployment workflows reuse manifest script for Compose validation', () => {
  for (const workflowPath of [
    '.github/workflows/_update-integration-manifest.yml',
    '.github/workflows/deploy-integration.yml',
    '.github/workflows/deploy-production.yml',
    '.github/workflows/promote-production.yml',
    '.github/workflows/pr_main.yml',
  ]) {
    const content = fs.readFileSync(path.join(root, workflowPath), 'utf8');
    assert.match(content, /manifest\.mjs validate-compose/, `${workflowPath} should use validate-compose`);
    assert.equal(content.includes('render-compose-env'), false, `${workflowPath} should not duplicate render-compose-env`);
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

test('trivy nightly scans production manifest digests instead of latest tags', () => {
  const workflow = readYaml('.github/workflows/trivy-nightly.yml');
  const content = fs.readFileSync(path.join(root, '.github/workflows/trivy-nightly.yml'), 'utf8');
  const listStep = workflow.jobs['production-images'].steps.find((step) => step.name === 'List production image refs');

  assert.match(listStep.run, /manifest\.mjs list-images/);
  assert.match(listStep.run, /deploy\/manifests\/production\.yaml/);
  assert.equal(content.includes(':latest'), false);
  assert.equal(content.includes('${{ matrix.image }}'), true);
});
