/**
 * Post-install patches for edge runtime compatibility.
 *
 * 1. Patches @openworkers/adapter-sveltekit for Windows backslash paths.
 * 2. Patches punycode.js package.json to add "module" field so esbuild
 *    can resolve it in neutral platform mode (required by markdown-it).
 *
 * Run automatically via postinstall or manually: bun scripts/patch-adapter.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// --- Patch 1: OpenWorkers adapter Windows backslash fix ---
const adapterIndex = join(
  process.cwd(),
  'node_modules/@openworkers/adapter-sveltekit/dist/index.js'
);

const before = `urlPath.includes("/dist/");`;
const after = `urlPath.includes("/dist/") || urlPath.includes("\\\\dist\\\\");`;

try {
  let content = readFileSync(adapterIndex, 'utf-8');
  if (content.includes(after)) {
    console.log('[patch-adapter] Already patched.');
  } else if (content.includes(before)) {
    content = content.replace(before, after);
    writeFileSync(adapterIndex, content);
    console.log('[patch-adapter] Patched adapter for Windows backslash compatibility.');
  } else {
    console.log('[patch-adapter] Target string not found — adapter may have been updated.');
  }
} catch (e: any) {
  console.warn(`[patch-adapter] Could not patch adapter: ${e.message}`);
}

// --- Patch 2: punycode.js module field for esbuild neutral platform ---
const punycodePkg = join(process.cwd(), 'node_modules/punycode.js/package.json');

try {
  const pkg = JSON.parse(readFileSync(punycodePkg, 'utf-8'));
  if (pkg.module) {
    console.log('[patch-punycode] Already has module field.');
  } else {
    pkg.module = 'punycode.es6.js';
    writeFileSync(punycodePkg, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[patch-punycode] Added "module" field for edge bundler compatibility.');
  }
} catch (e: any) {
  console.warn(`[patch-punycode] Could not patch: ${e.message}`);
}
