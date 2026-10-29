#!/usr/bin/env node
/**
 * Preview Install Allowlist Hook — fail-closed wrapper for `npm install`.
 * Week-1: block only (no package age warn). npm registry specs only.
 * Finding comments use the Action never-claim footer verbatim.
 */
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { planInstall, splitInstallArgv } from '../lib/install-plan.mjs';

/**
 * @param {string[]} npmArgs
 * @param {string} cwd
 * @returns {Promise<number>}
 */
export function spawnNpmInstall(npmArgs, cwd) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['install', ...npmArgs], { cwd, stdio: 'inherit' });
    child.on('error', () => resolve(127));
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   probe?: (name: string) => Promise<{ exists: boolean, status: number }>,
 *   spawnNpm?: (npmArgs: string[], cwd: string) => Promise<number>,
 *   log?: (line: string) => void,
 *   error?: (line: string) => void,
 * }} [opts]
 * @returns {Promise<number>}
 */
export async function main(argv, opts = {}) {
  const log = opts.log ?? console.log;
  const error = opts.error ?? console.error;
  const parsed = splitInstallArgv(argv, opts.cwd ?? process.cwd());
  const plan = await planInstall({
    rootDir: parsed.rootDir,
    packageSpecs: parsed.packageSpecs,
    probe: opts.probe,
  });

  log(plan.comment);
  if (!plan.ok) {
    error(`PhantomDep Install Allowlist Hook: ${plan.findings.length} block finding(s)`);
    return 1;
  }
  if (parsed.dryRun) {
    log('PhantomDep Install Allowlist Hook: dry-run ok (npm install not started)');
    return 0;
  }

  const spawnNpm = opts.spawnNpm ?? spawnNpmInstall;
  const code = await spawnNpm(parsed.npmArgs, parsed.rootDir);
  if (code === 0) log('PhantomDep Install Allowlist Hook: ok');
  return code;
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}
