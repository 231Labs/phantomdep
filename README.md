# PhantomDep Gate

Fail-closed GitHub Action: new **npm** deps on a PR must exist on the registry (and optionally on `.phantomdep-allowlist`) — or the PR fails with a Punch List–tone findings comment.

**Host:** phantomdep.231labs.com (Preview) · **Holdco:** 231 Labs Ltd  
**Week-1 scope:** existence + allowlist **block** only. No package-age warn. No SCA / malware claims.

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

## Develop

```bash
npm ci
npm test
npm run build
```

## CI workflows (blocked on token scope)

Canonical workflow YAML lives in `docs/github-workflows/` until the pushing identity has the GitHub `workflow` OAuth scope. To enable:

```bash
gh auth refresh -h github.com -s workflow,repo,read:org,gist
cp docs/github-workflows/*.yml .github/workflows/
git add .github/workflows && git commit -m "Enable CI + gate workflows" && git push
```

Until then, run locally: `npm test && npm run build`.

## Checkout (test only)

See `.env.example`. Seat price TBD — do not invent. Live Stripe / Production held until Al unlocks.

## Claims

Product SoT: Virginia `phantomdep-claims-v1.md`. `npm test` runs banned-phrase + never-claim harnesses.
