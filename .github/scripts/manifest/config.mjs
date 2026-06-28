import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeServices } from '../services.mjs';

const scriptPath = fileURLToPath(import.meta.url);

export { runtimeServices };

export const defaultRoot = process.env.REPOSITORY_ROOT ||
  process.env.GITHUB_WORKSPACE ||
  path.resolve(path.dirname(scriptPath), '../../..');

export const defaultSchemaPath = 'deploy/manifests/schema.json';

export const composeEnvNames = new Map([
  ['auth-service', 'AUTH_SERVICE_IMAGE'],
  ['project-service', 'PROJECT_SERVICE_IMAGE'],
  ['task-service', 'TASK_SERVICE_IMAGE'],
  ['notification-service', 'NOTIFICATION_SERVICE_IMAGE'],
  ['gateway', 'GATEWAY_IMAGE'],
  ['client', 'CLIENT_IMAGE'],
]);

export const gitShaPattern = /^[0-9a-f]{40}$/;
export const digestPattern = /^sha256:[0-9a-f]{64}$/;
export const ghcrDigestPattern = /^ghcr\.io\/[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*@sha256:[0-9a-f]{64}$/;
export const versionedManifestPattern = /^manifest-(.+)\.ya?ml$/;

export function assertKnownService(service) {
  if (!runtimeServices.includes(service)) {
    throw new Error(`Unknown service '${service}'. Expected one of: ${runtimeServices.join(', ')}.`);
  }
}

export function deepClone(value) {
  return structuredClone(value);
}

export function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
