import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './manifest/cli.mjs';

export { runtimeServices } from './manifest/config.mjs';
export { validateManifestObject, validateManifestFile, writeManifestFile } from './manifest/validate.mjs';
export { createVersionedManifest, latestManifest, updateManifest, versionedManifestFiles } from './manifest/update.mjs';
export { promoteService, promoteServices } from './manifest/promote.mjs';
export { listImages, renderComposeEnv, renderComposeFile, validateComposeConfig, verifyComposeFile } from './manifest/compose.mjs';
export { main };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
