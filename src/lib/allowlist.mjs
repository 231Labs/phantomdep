/**
 * Optional org allowlist: `.phantomdep-allowlist` (one package name per line).
 * `#` comments and blank lines ignored.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} rootDir
 * @returns {{ enabled: boolean, names: Set<string>, path: string | null }}
 */
export function loadAllowlist(rootDir) {
  const path = join(rootDir, '.phantomdep-allowlist');
  if (!existsSync(path)) {
    return { enabled: false, names: new Set(), path: null };
  }
  const text = readFileSync(path, 'utf8');
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    names.add(trimmed);
  }
  return { enabled: true, names, path };
}
