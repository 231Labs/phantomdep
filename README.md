# PhantomDep Gate

Fail-closed GitHub Action and Preview install hook: an **npm** package may proceed when it exists on the registry, or when a registry miss is listed in `.phantomdep-allowlist`. Otherwise the check fails with a Punch List–tone findings comment.

**Host:** https://phantomdep.231labs.com (Preview) · **Holdco:** 231 Labs Ltd  
**Tip:** main @ `681f8d0` (PRs #1–#4 merged). CI on that tip is green (`npm test`, `npm run build`).  
**Week-1 scope:** existence + allowlist **block** only. No package age warn. Engineering findings only.

> Registry / allowlist gate — engineering findings only. Not SCA, not malware-free, not “secure by default.”

## Use the Action

```yaml
# .github/workflows/phantomdep.yml
name: PhantomDep Gate
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 231Labs/phantomdep@main
```

Optional allowlist file in the consumer repo:

```
# .phantomdep-allowlist
@myorg/private-pkg
```

## Install Allowlist Hook (Preview)

Local wrapper for `npm install`. Same spine as the Action: a registry hit may install; a registry miss may install only when the name is on `.phantomdep-allowlist`; anything else is a **block**. Week-1 does not warn on package age. npm registry specs only (`file:`, git, and URL specs fail closed).

The findings comment ends with the Action never-claim footer, verbatim.

```bash
# this checkout
npm ci

# throwaway consumer
mkdir -p /tmp/phantomdep-consumer && cd /tmp/phantomdep-consumer
npm init -y
HOOK=/path/to/phantomdep/src/hook/install.mjs

# block: not on the registry and not allowlisted (npm install does not start)
node "$HOOK" this-package-definitely-does-not-exist-phantomdep-9f3a2

# allow: registry hit, then npm install
node "$HOOK" lodash

# allow: registry miss listed in .phantomdep-allowlist (dry-run does not start npm)
printf '%s\n' '@myorg/private-pkg' > .phantomdep-allowlist
node "$HOOK" --phantomdep-dry-run @myorg/private-pkg
```

`--dir <consumer>` sets the allowlist and `package.json` root. With no package args, the hook checks `package.json` and the lockfile, then runs `npm install`.

## Develop

```bash
npm ci
npm test
npm run build
```

## Status (Preview)

Workflows are on main (`.github/workflows/ci.yml`, `.github/workflows/phantomdep-gate.yml`). `docs/github-workflows/` matches those files. CI on `681f8d0` runs `npm ci`, `npm test`, and `npm run build`.

Preview Checkout is configured in Stripe **test** mode. `GET /api/checkout` returns `"ok": true` and `"configured": true`. `POST /api/checkout` answers **303** to Stripe test Checkout. `/?checkout=success` and `/?checkout=cancel` show Preview notes only (no live billing). Seat price configuration stays in the environment; do not invent a price id. Secret names stay in `.env.example`.

`POST /api/stripe/webhook` without a `Stripe-Signature` header fails closed: **400** `{"error":"Missing Stripe signature."}`.

This tree does not record secret values, live Stripe keys, or a Production cutover.

Copy-paste checks: [docs/preview-smoke.md](docs/preview-smoke.md).

## Claims

Product SoT: Virginia `phantomdep-claims-v1.md`. `npm test` runs banned-phrase + never-claim harnesses.
