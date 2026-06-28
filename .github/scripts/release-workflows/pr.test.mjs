import test from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from './helpers.mjs';

test('PR workflow delegates grouped checks to reusable workflows', () => {
  const workflow = readYaml('.github/workflows/pr_main.yml');
  const appChecks = readYaml('.github/workflows/_pr-app-checks.yml');
  const dockerChecks = readYaml('.github/workflows/_pr-docker-checks.yml');

  assert.equal(workflow.jobs['app-checks'].uses, './.github/workflows/_pr-app-checks.yml');
  assert.equal(workflow.jobs['docker-checks'].uses, './.github/workflows/_pr-docker-checks.yml');
  assert.equal(workflow.jobs.security.uses, './.github/workflows/_pr-security.yml');
  assert.equal(appChecks.jobs.backend.steps.at(-1).uses, './.github/actions/backend-checks');
  assert.equal(appChecks.jobs.client.steps.at(-1).uses, './.github/actions/client-checks');
  assert.equal(
    dockerChecks.jobs.services.steps.find((step) => step.name === 'Build image without pushing').uses,
    './.github/actions/build-service-image',
  );
  assert.equal(dockerChecks.jobs.services.strategy['max-parallel'], undefined);
  assert.equal(workflow.jobs.changes.steps.find((step) => step.id === 'plan').uses, './.github/actions/detect-ci-plan');
});

test('PR workflow skips expensive checks for automated Version Packages PRs', () => {
  const workflow = readYaml('.github/workflows/pr_main.yml');
  const versionBranchGuard = /github\.event\.pull_request\.head\.ref != 'changesets\/version-packages'/;
  const guardedJobs = ['changes', 'app-checks', 'docker-checks', 'security'];

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
