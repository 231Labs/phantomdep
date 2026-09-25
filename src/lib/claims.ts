/**
 * PhantomDep Gate — claims module (day 0).
 * Product SoT: /workspace/foundry/phantomdep-claims-v1.md (Virginia)
 * Runtime CI imports the .mjs twin; keep both in sync.
 * Week-1: block only (no warn verdict copy).
 */

export const BANNED: RegExp[] = [
  /\bsecure by default\b/i,
  /\b(malware|virus)[- ]free\b/i,
  /\bno malware\b/i,
  /\bguarantee[sd]?\b[\s\S]{0,40}\b(safe|secure)\b/i,
  /\b(safe|secure) dependencies guaranteed\b/i,
  /\b(full|complete)\s+SCA\b/i,
  /\breplaces?\s+(snyk|dependabot|socket)\b/i,
  /\bdetects?\s+(all\s+)?(cves?|vulnerabilit(y|ies))\b/i,
  /\bCVE[- ]?(free|proof)\b/i,
  /\b(certified|certification)\b/i,
  /\b(SOC\s*2|ISO\s*27001)\s+compliant\b/i,
  /\bprotects?\s+you\s+from\s+(supply[- ]chain|typosquat|slopsquat)/i,
  /\bimmune to\b/i,
  /\bzero[- ]risk\b/i,
  /\bunhackable\b/i,
  /\bbulletproof\b/i,
  /\b(catches|blocks|stops)\s+all\s+(hallucinated|phantom|slopsquat)/i,
  /\bAI[- ]proof\b/i,
  /\bhallucination[- ]proof\b/i,
  /\b\d+(\.\d+)?%\s+(accuracy|detection|recall|precision)\b/i,
  /\bonly\s+\d+\s+(spots|seats|orgs|agencies)\s+left\b/i,
  /\bguaranteed?\s+(roi|results|savings|revenue)\b/i,
  /\bpassive\s+income\b/i,
  /\bas\s+seen\s+in\b/i,
  /\b(ADA|WCAG|508|EAA)[- ]compliant\b/i,
  /\bprotects?\s+you\s+from\s+(a\s+)?(lawsuit|litigation)\b/i,
  /\blegally (compliant|safe)\b/i,
];

export const NON_CLAIM_LONG =
  'PhantomDep Gate checks whether dependency names resolve on the registry and match your allowlist. It produces engineering findings (name, evidence, block). It is not a software composition analysis (SCA) platform, not a malware or vulnerability scanner, not a guarantee that allowed packages are safe, and not a certification that your supply chain is secure.';

export const NON_CLAIM_SHORT =
  'Registry / allowlist gate — engineering findings only. Not SCA, not malware-free, not “secure by default.”';

export function claimIn(text: string): { pattern: RegExp; match: string } | null {
  let scrubbed = String(text ?? '');
  for (const allowed of [NON_CLAIM_LONG, NON_CLAIM_SHORT]) {
    scrubbed = scrubbed.split(allowed).join(' ');
  }
  scrubbed = scrubbed.replace(
    /Registry \/ allowlist gate — engineering findings only\. Not SCA, not malware-free, not ["“]secure by default["”]\./gi,
    ' ',
  );
  for (const pattern of BANNED) {
    const m = scrubbed.match(pattern);
    if (m) return { pattern, match: m[0] };
  }
  return null;
}

export function hasRequiredNonClaim(text: string): boolean {
  const t = String(text ?? '').toLowerCase();
  if (t.includes(NON_CLAIM_SHORT.toLowerCase().slice(0, 40))) return true;
  const hasNot = /\bnot\b/.test(t);
  const hasSca = /\bsca\b/.test(t) || t.includes('software composition');
  const hasMalware = t.includes('malware') || t.includes('malware-free');
  const hasSecure =
    t.includes('secure by default') ||
    t.includes('security certification') ||
    t.includes('certified secure');
  if (hasNot && (hasSca || hasMalware || hasSecure)) return true;
  if (t.includes('engineering findings only') && hasNot) return true;
  return false;
}

export function assertClaimSafe(text: string, surface = 'copy'): string {
  const hit = claimIn(text);
  if (hit) throw new Error(`refusing ${surface}: banned claim "${hit.match}"`);
  return text;
}
