import { extractDigest } from './validate.mjs';
import { sameJson } from './config.mjs';

export function changesForServices(before, after, services) {
  return services.map((service) => ({
    service,
    oldVersion: before.services[service].version,
    newVersion: after.services[service].version,
    oldDigest: extractDigest(before.services[service].image),
    newDigest: extractDigest(after.services[service].image),
    changed: !sameJson(before.services[service], after.services[service]),
  }));
}

export function markdownSummary(title, changes, unchangedServices = []) {
  const lines = [
    `## ${title}`,
    '',
    '| service | old version | new version | old image digest | new image digest |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const change of changes) {
    lines.push(`| ${change.service} | ${change.oldVersion} | ${change.newVersion} | \`${change.oldDigest}\` | \`${change.newDigest}\` |`);
  }

  if (changes.length === 0) {
    lines.push('| none | - | - | - | - |');
  }

  if (unchangedServices.length > 0) {
    lines.push('', `Unchanged services verified: ${unchangedServices.join(', ')}.`);
  }

  return `${lines.join('\n')}\n`;
}
