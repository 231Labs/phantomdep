/**
 * Probe registry.npmjs.org for package existence (fail-closed on miss).
 * Injectable fetch for tests.
 */

/**
 * @param {string} name
 * @param {{ fetch?: typeof fetch }} [opts]
 * @returns {Promise<{ exists: boolean, status: number }>}
 */
export async function probeNpm(name, opts = {}) {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const res = await fetchFn(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'phantomdep-gate/0.1' },
  });
  // 200 = exists; 404 = missing; other = treat as miss (fail-closed)
  if (res.status === 200) return { exists: true, status: 200 };
  return { exists: false, status: res.status };
}
