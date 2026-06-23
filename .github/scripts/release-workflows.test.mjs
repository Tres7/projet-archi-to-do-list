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

test('deprecated release-images workflow is manual and informational only', () => {
  const workflow = readYaml('.github/workflows/release-images.yml');
  const triggers = workflow.on || workflow.true;
  const content = fs.readFileSync(path.join(root, '.github/workflows/release-images.yml'), 'utf8');

  assert.ok(Object.hasOwn(triggers, 'workflow_dispatch'));
  assert.equal(content.includes('release:'), false);
  assert.equal(content.includes('_retag-ghcr-image.yml'), false);
  assert.equal(content.includes('docker/build-push-action'), false);
  assert.equal(content.includes('type=raw,value=latest'), false);
  assert.equal(content.includes(':latest'), false);
});
