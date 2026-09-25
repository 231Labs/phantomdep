/**
 * Extract npm package names from package.json (+ optional package-lock.json).
 * MVP: npm-only. Scoped names preserved (@scope/name).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} rootDir
 * @returns {{ names: string[], sources: string[] }}
 */
export function collectNpmDeps(rootDir) {
  const names = new Set();
  const sources = [];

  const pkgPath = join(rootDir, 'package.json');
  if (existsSync(pkgPath)) {
    sources.push('package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const block = pkg[field];
      if (block && typeof block === 'object') {
        for (const name of Object.keys(block)) names.add(name);
      }
    }
  }

  const lockPath = join(rootDir, 'package-lock.json');
  if (existsSync(lockPath)) {
    sources.push('package-lock.json');
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    // lockfileVersion 2/3: packages[""] is root; other keys are "node_modules/…"
    if (lock.packages && typeof lock.packages === 'object') {
      for (const key of Object.keys(lock.packages)) {
        if (!key || key === '') continue;
        const name = lockPackageName(key, lock.packages[key]);
        if (name) names.add(name);
      }
    }
    // lockfileVersion 1: dependencies tree
    if (lock.dependencies && typeof lock.dependencies === 'object') {
      walkLockV1(lock.dependencies, names);
    }
  }

  return { names: [...names].sort(), sources };
}

/**
 * @param {string} key
 * @param {{ name?: string }} meta
 */
function lockPackageName(key, meta) {
  if (meta?.name) return meta.name;
  // "node_modules/foo" or "node_modules/@scope/bar" or nested
  const m = key.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/);
  return m ? m[1] : null;
}

/**
 * @param {Record<string, { dependencies?: Record<string, unknown> }>} deps
 * @param {Set<string>} names
 */
function walkLockV1(deps, names) {
  for (const [name, meta] of Object.entries(deps)) {
    names.add(name);
    if (meta?.dependencies) walkLockV1(meta.dependencies, names);
  }
}
