import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument '${arg}'.`);
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

export function findSection(content, version) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingPattern = new RegExp(`^#{1,6}\\s+\\[?v?${escapedVersion}\\]?(?:\\s|$)`, 'i');
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (start === -1) {
    return '';
  }

  const currentLevel = lines[start].match(/^#+/)?.[0].length || 1;
  const section = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+/);
    if (heading && heading[1].length <= currentLevel) {
      break;
    }

    section.push(lines[index]);
  }

  return section.join('\n').trim();
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const changelogPath = options.changelog;
  const version = options.version;
  const outputPath = options.output;

  if (!changelogPath || !version || !outputPath) {
    throw new Error('Usage: node .github/scripts/extract-changelog-section.mjs --changelog <path> --version <version> --output <path>');
  }

  const fullChangelogPath = path.resolve(changelogPath);
  const fullOutputPath = path.resolve(outputPath);

  if (!fs.existsSync(fullChangelogPath)) {
    throw new Error(`Changelog file '${changelogPath}' does not exist.`);
  }

  const section = findSection(fs.readFileSync(fullChangelogPath, 'utf8'), version);
  if (!section) {
    throw new Error(`No changelog section found for version '${version}' in '${changelogPath}'.`);
  }

  fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true });
  fs.writeFileSync(fullOutputPath, `${section}\n`);
  console.log(`Wrote release notes for ${version} to ${outputPath}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
