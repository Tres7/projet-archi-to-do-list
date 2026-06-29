import test from 'node:test';
import assert from 'node:assert/strict';
import { readText, readYaml } from './helpers.mjs';

const composeOverrideKey = ['compose', 'env', 'overrides'].join('_');
const runtimeApiVersionPattern = new RegExp([
  ['COMPOSE', 'ENV', 'OVERRIDES'].join('_'),
  ['VITE', 'API', 'VERSION'].join('_'),
].join('|'));

test('release workflow deploys production with manual environment approval', () => {
  const workflow = readYaml('.github/workflows/release.yml');
  const job = workflow.jobs.deploy;

  assert.ok(workflow.on.workflow_dispatch.inputs.manifest_version);
  assert.deepEqual(workflow.on.workflow_run.workflows, ['Deploy Integration']);
  assert.deepEqual(workflow.on.workflow_run.branches, ['main']);
  assert.equal(job.uses, './.github/workflows/_deploy-compose.yml');
  assert.equal(job.with.deployment_name, 'todo-production');
  assert.equal(job.with.environment_name, 'production');
  assert.equal(job.secrets.vm_host, '${{ secrets.VM_HOST_PROD }}');
  assert.equal(job.secrets.vm_user, '${{ secrets.VM_USER_PROD }}');
  assert.equal(job.secrets.ssh_private_key, '${{ secrets.SSH_PRIVATE_KEY_PROD }}');
});

test('integration deployment executes workflow code from trusted main', () => {
  const workflow = readYaml('.github/workflows/deploy-integration.yml');
  const job = workflow.jobs.deploy;

  assert.ok(workflow.on.workflow_dispatch.inputs.manifest_version);
  assert.equal(job.uses, './.github/workflows/_deploy-compose.yml');
  assert.equal(job.with.deployment_name, 'todo-integration');
  assert.equal(job.with.environment_name, 'integration');
  assert.equal(composeOverrideKey in job.with, false);
  assert.equal(job.secrets.vm_host, '${{ secrets.VM_HOST_INT }}');
  assert.equal(job.secrets.vm_user, '${{ secrets.VM_USER_INT }}');
  assert.equal(job.secrets.ssh_private_key, '${{ secrets.SSH_PRIVATE_KEY_INT }}');
});

test('shared Compose deployment workflow renders, copies, and deploys without server bootstrap', () => {
  const workflow = readYaml('.github/workflows/_deploy-compose.yml');
  const job = workflow.jobs.deploy;
  const checkoutStep = job.steps.find((step) => step.name === 'Checkout trusted deployment source');
  const validateStep = job.steps.find((step) => step.name === 'Validate deployment manifest');
  const bundleStep = job.steps.find((step) => step.name === 'Build deployment bundle');
  const copyStep = job.steps.find((step) => step.name === 'Copy deployment bundle');
  const deployStep = job.steps.find((step) => step.name === 'Run deployment');
  const remoteScript = readText('.github/scripts/deploy/remote-compose-up.sh');

  assert.equal(job.environment, '${{ inputs.environment_name }}');
  assert.equal(checkoutStep.with.ref, '${{ inputs.trusted_ref }}');
  assert.equal(checkoutStep.with['persist-credentials'], false);
  assert.match(validateStep.run, /manifest\.mjs validate-compose/);
  assert.match(bundleStep.run, /manifest\.mjs render-compose/);
  assert.match(bundleStep.run, /manifest\.mjs verify-compose/);
  assert.equal(copyStep.uses, 'appleboy/scp-action@ff85246acaad7bdce478db94a363cd2bf7c90345');
  assert.doesNotMatch(bundleStep.run, /inputs\.deploy_path/);
  assert.equal(deployStep.with.script_path, '.github/scripts/deploy/remote-compose-up.sh');
  assert.equal(composeOverrideKey in workflow.on.workflow_call.inputs, false);
  assert.doesNotMatch(remoteScript, runtimeApiVersionPattern);
  assert.doesNotMatch(remoteScript, /apt-get|docker\.io|docker-compose-plugin|systemctl enable/);
  assert.match(remoteScript, /Create \$shared_server_env before deploying/);
  assert.match(remoteScript, /cp "\$INCOMING_DIR\/compose\.yml" "\$app_dir\/compose\.yml"/);
});

test('nightly combines npm audit, CodeQL, and production Trivy scans', () => {
  const workflow = readYaml('.github/workflows/nightly.yml');
  const content = readText('.github/workflows/nightly.yml');

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
    '.github/workflows/_pr-app-checks.yml',
    '.github/workflows/_main-publish-manifest.yml',
    '.github/workflows/_deploy-compose.yml',
  ]) {
    assert.match(readText(workflowPath), /manifest\.mjs"? validate-compose/, `${workflowPath} should use validate-compose`);
  }
});

test('manifest branch helper validates branch inputs before git commands', () => {
  const action = readYaml('.github/actions/prepare-manifest-branch/action.yml');
  const script = action.runs.steps.find((step) => step.name === 'Prepare branch').run;

  assert.match(script, /Invalid manifest branch name/);
  assert.match(script, /Invalid base branch name/);
  assert.match(script, /\[\^A-Za-z0-9\._\/-\]/);
});
