import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject } from './validate.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');

function logValidation(label, result) {
  console.log(`${label}: ${result.files} files; ${result.bundles.length} bundles; ${result.games.length} playable games.`);
}

try {
  logValidation('Source validation passed', validateProject(projectRoot));
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = await fs.readdir(projectRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (['dist', '.git', 'node_modules'].includes(entry.name)) continue;
    await fs.cp(path.join(projectRoot, entry.name), path.join(outputRoot, entry.name), { recursive: true });
  }
  logValidation('Build validation passed', validateProject(outputRoot));
  console.log(`Static output created at ${path.relative(projectRoot, outputRoot)}/`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
}
