import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ownPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(ownPath), '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

export function validateProject(root = defaultRoot) {
  const htmlPath = path.join(root, 'index.html');
  assert(fs.existsSync(htmlPath), 'Missing index.html');
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  assert(/<canvas\b[^>]*id=["']GameCanvas["']/.test(html), 'Cocos GameCanvas element is missing');

  const requiredEntrypoints = [
    'style-mobile.f044d.css',
    'favicon.8de18.ico',
    'src/settings.03ed6.js',
    'ym-offline-fallback.90loopfix.js',
    'main.f76b9.js',
    'cocos2d-js-min.3af49.js'
  ];
  for (const asset of requiredEntrypoints) {
    assert(fs.existsSync(path.join(root, asset)), `Missing entry asset: ${asset}`);
  }

  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(ref)) continue;
    const relativePath = decodeURIComponent(new URL(ref, 'https://local.invalid/').pathname).replace(/^\//, '');
    assert(fs.existsSync(path.join(root, relativePath)), `Broken local HTML reference: ${ref}`);
  }

  const entryOrder = [
    html.indexOf('src/settings.03ed6.js'),
    html.indexOf('ym-offline-fallback.90loopfix.js'),
    html.indexOf('main.f76b9.js')
  ];
  assert(entryOrder.every((position) => position >= 0), 'Settings, fallback, or boot script is not referenced');
  assert(entryOrder[0] < entryOrder[1] && entryOrder[1] < entryOrder[2], 'Offline fallback must load after settings and before the game boot script');

  const settings = fs.readFileSync(path.join(root, 'src/settings.03ed6.js'), 'utf8');
  assert(settings.includes('launchScene:"db://assets/Scene/main/LobbyMain.fire"'), 'Settings must launch the bundled LobbyMain scene');

  const assetsRoot = path.join(root, 'assets');
  const bundleDirs = fs.readdirSync(assetsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const bundles = [];
  for (const dir of bundleDirs) {
    const bundleRoot = path.join(assetsRoot, dir);
    const configName = fs.readdirSync(bundleRoot).find((name) => /^config\..+\.json$/.test(name));
    if (!configName) continue;
    const configPath = path.join(bundleRoot, configName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(config.name === dir, `Bundle name mismatch in ${configPath}`);
    const hash = configName.match(/^config\.(.+)\.json$/)?.[1];
    assert(hash && fs.existsSync(path.join(bundleRoot, `index.${hash}.js`)), `Missing bundle index for ${dir}`);
    for (const base of ['importBase', 'nativeBase']) {
      const assetDir = path.join(bundleRoot, config[base]);
      assert(fs.existsSync(assetDir), `Missing ${base} directory for ${dir}`);
      assert(listFiles(assetDir).length > 0, `Empty ${base} directory for ${dir}`);
    }
    bundles.push({ name: dir, config });
  }

  const expectedGames = ['120_Slot_AfricanBuffalo', '124_Slot_GoldenCentury'];
  for (const name of expectedGames) {
    assert(bundles.some((bundle) => bundle.name === name), `Missing supported offline game bundle: ${name}`);
  }
  const offlineFallback = fs.readFileSync(path.join(root, 'ym-offline-fallback.90loopfix.js'), 'utf8');
  assert(/var ids\s*=\s*\[120,\s*124\]/.test(offlineFallback), 'Offline game list must match the two bundled games');

  const allFiles = listFiles(root).filter((file) => {
    const relative = path.relative(root, file).split(path.sep);
    return !['.git', 'node_modules', 'dist'].includes(relative[0]);
  });
  const zeroByteFiles = allFiles.filter((file) => fs.statSync(file).size === 0);
  assert(zeroByteFiles.length === 0, `Found empty files: ${zeroByteFiles.map((file) => path.relative(root, file)).join(', ')}`);

  const imageCount = allFiles.filter((file) => /\.(?:png|jpe?g|ico)$/i.test(file)).length;
  const audioCount = allFiles.filter((file) => /\.(?:mp3|ogg|wav)$/i.test(file)).length;
  assert(imageCount > 0 && audioCount > 0, 'Expected supplied image and audio assets are missing');

  return {
    files: allFiles.length,
    bundles: bundles.map((bundle) => bundle.name),
    games: expectedGames,
    images: imageCount,
    audio: audioCount
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === ownPath) {
  try {
    const result = validateProject(process.argv[2] ? path.resolve(process.argv[2]) : defaultRoot);
    console.log(`Validation passed: ${result.files} files; ${result.bundles.length} Cocos bundles; ${result.games.length} playable offline games; ${result.images} images; ${result.audio} audio files.`);
  } catch (error) {
    console.error(`Validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
