import { assertKnownService, deepClone, defaultRoot, defaultSchemaPath, runtimeServices, sameJson } from './config.mjs';
import { resolvePath, writeGithubOutput, writeOptionalSummary } from './io.mjs';
import { changesForServices, markdownSummary } from './summary.mjs';
import { validateManifestFile, validateManifestObject, writeManifestFile } from './validate.mjs';

export function promoteService({
  service,
  fromPath,
  toPath,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  const result = promoteServices({
    services: [service],
    fromPath,
    toPath,
    summaryFile,
    githubOutput,
    repositoryRoot,
    schemaPath,
  });

  return {
    changedCount: result.changedCount,
    changes: result.changes,
    summary: result.summary,
  };
}

export function promoteServices({
  services,
  fromPath,
  toPath,
  summaryFile,
  githubOutput,
  repositoryRoot = defaultRoot,
  schemaPath = defaultSchemaPath,
}) {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('promote requires at least one service.');
  }

  const selectedServices = [...new Set(services)];
  for (const service of selectedServices) {
    assertKnownService(service);
  }

  if (!fromPath || !toPath) {
    throw new Error('promote requires --service <service> --from <integration.yaml> --to <production.yaml>.');
  }

  const from = validateManifestFile(fromPath, { repositoryRoot, schemaPath });
  const to = validateManifestFile(toPath, { repositoryRoot, schemaPath });
  const candidate = deepClone(to);

  for (const service of selectedServices) {
    candidate.services[service] = { ...from.services[service] };
  }

  validateManifestObject(candidate, toPath, { repositoryRoot, schemaPath });

  for (const candidateService of runtimeServices) {
    if (!selectedServices.includes(candidateService) && !sameJson(to.services[candidateService], candidate.services[candidateService])) {
      throw new Error(`${candidateService} changed during promotion but was not requested.`);
    }
  }

  const changes = changesForServices(to, candidate, selectedServices);
  const changedCount = changes.filter((change) => change.changed).length;
  const summary = markdownSummary(
    'Production promotion',
    changes,
    runtimeServices.filter((candidateService) => !selectedServices.includes(candidateService)),
  );

  if (changedCount > 0) {
    writeManifestFile(toPath, candidate, { repositoryRoot, schemaPath });
  }

  writeOptionalSummary(summaryFile, summary, repositoryRoot);

  if (githubOutput) {
    writeGithubOutput(resolvePath(githubOutput, repositoryRoot), {
      changed_count: String(changedCount),
      services: selectedServices.join(','),
    });
  }

  return { changedCount, changes, summary };
}
