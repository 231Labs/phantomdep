/**
 * Plan a fail-closed npm install. Does not spawn npm.
 * Registry package specs only. file:, git, and URL specs block.
 */
import { collectNpmDeps } from './parse-deps.mjs';
import { evaluateNpmNames, renderGateComment } from './gate.mjs';

/**
 * @param {string} spec
 * @returns {string | null} registry package name, or null when the spec is not a registry name
 */
export function npmRegistryName(spec) {
  if (typeof spec !== 'string') return null;
  const raw = spec.trim();
  if (
    !raw ||
    raw.startsWith('-') ||
    raw.startsWith('.') ||
    raw.startsWith('/') ||
    raw.includes(':') ||
    raw.includes('\\') ||
    raw.includes(' ')
  ) {
    return null;
  }

  let name = raw;
  if (raw.startsWith('@')) {
    const slash = raw.indexOf('/');
    if (slash <= 1) return null;
    const ver = raw.indexOf('@', slash + 1);
    name = ver === -1 ? raw : raw.slice(0, ver);
  } else {
    const ver = raw.indexOf('@');
    name = ver === -1 ? raw : raw.slice(0, ver);
  }

  if (!name || name.endsWith('/')) return null;
  return name;
}

/**
 * Hook flags are stripped. Remaining args are forwarded to `npm install`.
 *
 * @param {string[]} argv
 * @param {string} [cwd]
 */
export function splitInstallArgv(argv, cwd = process.cwd()) {
  let rootDir = cwd;
  let dryRun = false;
  /** @type {string[]} */
  const packageSpecs = [];
  /** @type {string[]} */
  const npmArgs = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('--dir requires a path');
      rootDir = next;
      i += 1;
      continue;
    }
    if (arg === '--phantomdep-dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--') {
      npmArgs.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith('-')) {
      npmArgs.push(arg);
      continue;
    }
    packageSpecs.push(arg);
    npmArgs.push(arg);
  }

  return { rootDir, dryRun, packageSpecs, npmArgs };
}

/**
 * @param {{
 *   rootDir: string,
 *   packageSpecs: string[],
 *   probe?: (name: string) => Promise<{ exists: boolean, status: number }>,
 *   fetch?: typeof fetch,
 * }} input
 */
export async function planInstall({ rootDir, packageSpecs, probe, fetch }) {
  /** @type {{ name: string, evidence: string, severity: 'block', nextStep: string }[]} */
  const extraFindings = [];
  /** @type {string[]} */
  const names = [];

  if (packageSpecs.length === 0) {
    names.push(...collectNpmDeps(rootDir).names);
  } else {
    for (const spec of packageSpecs) {
      const name = npmRegistryName(spec);
      if (!name) {
        extraFindings.push({
          name: spec,
          evidence: 'not an npm registry package spec (fail-closed; npm only)',
          severity: 'block',
          nextStep: 'Pass an npm registry package name (optional version or tag)',
        });
      } else {
        names.push(name);
      }
    }
  }

  const evaluated = await evaluateNpmNames(rootDir, [...new Set(names)], { probe, fetch });
  if (extraFindings.length === 0) return evaluated;

  const findings = [...extraFindings, ...evaluated.findings];
  return {
    ok: false,
    findings,
    comment: renderGateComment(findings, evaluated.allowlistOverrides),
    allowlistEnabled: evaluated.allowlistEnabled,
    allowlistOverrides: evaluated.allowlistOverrides,
  };
}
