import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('../../../server/node_modules/js-yaml');

export const root = path.resolve(new URL('../../..', import.meta.url).pathname);

export function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function commitAll(cwd, message) {
  git(['add', '.'], cwd);
  git(['-c', 'user.name=CI', '-c', 'user.email=ci@example.com', 'commit', '-m', message], cwd);
  return git(['rev-parse', 'HEAD'], cwd);
}

export function assertDependabotSkipGuard(assert, condition) {
  const expression = String(condition);

  assert.match(expression, /github\.actor != 'dependabot\[bot\]'/);
  assert.match(expression, /head_commit\.author\.username != 'dependabot\[bot\]'/);
  assert.match(expression, /head_commit\.committer\.username != 'dependabot\[bot\]'/);
  assert.match(expression, /contains\(github\.event\.head_commit\.message, 'dependabot\/'\) == false/);
}

export function readYaml(filePath) {
  return yaml.load(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

export function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8');
}

export function workflowFiles() {
  return fs.readdirSync(path.join(root, '.github/workflows'))
    .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
    .sort();
}

export function actionFiles() {
  return fs.readdirSync(path.join(root, '.github/actions'))
    .map((directory) => `.github/actions/${directory}/action.yml`)
    .filter((filePath) => fs.existsSync(path.join(root, filePath)))
    .sort();
}
