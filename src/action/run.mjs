#!/usr/bin/env node
/**
 * GitHub Action entry — fail-closed npm existence + allowlist gate.
 * Posts PR comment when GITHUB_TOKEN + PR context available.
 */
import { writeFileSync } from 'node:fs';
import { runGate } from '../lib/gate.mjs';

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const result = await runGate(root);

const outPath = process.env.GITHUB_OUTPUT;
if (outPath) {
  writeFileSync(
    outPath,
    [`ok=${result.ok}`, `finding_count=${result.findings.length}`, ''].join('\n'),
    { flag: 'a' },
  );
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  writeFileSync(summaryPath, result.comment + '\n', { flag: 'a' });
}

// Best-effort PR comment
const token = process.env.GITHUB_TOKEN || process.env.PHANTOMDEP_GITHUB_TOKEN;
const eventPath = process.env.GITHUB_EVENT_PATH;
if (token && eventPath) {
  try {
    const event = JSON.parse(await (await import('node:fs/promises')).readFile(eventPath, 'utf8'));
    const pr = event.pull_request?.number;
    const repo = process.env.GITHUB_REPOSITORY; // owner/name
    if (pr && repo) {
      const [owner, name] = repo.split('/');
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${name}/issues/${pr}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'phantomdep-gate',
          },
          body: JSON.stringify({ body: result.comment }),
        },
      );
      if (!res.ok) {
        console.error(`PR comment failed: HTTP ${res.status}`);
      }
    }
  } catch (err) {
    console.error('PR comment skipped:', err instanceof Error ? err.message : err);
  }
}

console.log(result.comment);
if (!result.ok) {
  console.error(`PhantomDep Gate: ${result.findings.length} block finding(s)`);
  process.exit(1);
}
console.log('PhantomDep Gate: ok');
