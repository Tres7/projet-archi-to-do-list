import test from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from './helpers.mjs';

test('Dependabot updates only on schedule and does not rebase on every main push', () => {
  const config = readYaml('.github/dependabot.yml');

  for (const update of config.updates) {
    assert.equal(update['target-branch'], 'main');
    assert.equal(update['rebase-strategy'], 'disabled');
    assert.equal(update.schedule.interval, 'weekly');
  }
});
