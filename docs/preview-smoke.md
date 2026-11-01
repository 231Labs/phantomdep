# Preview smoke checklist

Host: https://phantomdep.231labs.com  
Tip: main @ post-#5 / this PR tip  
No secrets in these commands. Do not paste `sk_`, `whsec_`, or price ids. Names for those values stay in `.env.example`.

## Landing

```bash
curl -sS -D - -o /tmp/pd-landing.html https://phantomdep.231labs.com/
```

Expect HTTP 200. Body includes `231 Labs · Preview`, the never-claim line `Registry / allowlist gate — engineering findings only. Not SCA, not malware-free, not “secure by default.”`, and `/demo/phantomdep-gate-20s.gif`.

## Checkout (Stripe test)

```bash
curl -sS https://phantomdep.231labs.com/api/checkout
```

Expect JSON with `"ok":true` and `"configured":true`.

```bash
curl -sS -o /dev/null -D - -X POST https://phantomdep.231labs.com/api/checkout
```

Expect HTTP 303 and a `location` on Stripe test Checkout. Do not commit the URL.

## Checkout return notes

```bash
curl -sS "https://phantomdep.231labs.com/?checkout=success"
curl -sS "https://phantomdep.231labs.com/?checkout=cancel"
```

Success body includes `TEST Checkout completed.` Cancel body includes `Checkout canceled.`

## Webhook fail-closed

```bash
curl -sS -D - -o /tmp/pd-webhook.json -X POST https://phantomdep.231labs.com/api/stripe/webhook
```

Expect HTTP 400 and body `{"error":"Missing Stripe signature."}`. Send no `Stripe-Signature` header.

## Action entry

```bash
curl -sS https://raw.githubusercontent.com/231Labs/phantomdep/main/action.yml
```

Expect `using: composite` and `src/action/run.mjs`.

## Install Allowlist Hook (dry-run)

From a throwaway consumer directory, with `HOOK` pointing at `src/hook/install.mjs` in this checkout. These commands do not start `npm install`.

```bash
# unknown name after -- is blocked
node "$HOOK" --phantomdep-dry-run -- this-package-definitely-does-not-exist

# known package after -- is ok
node "$HOOK" --phantomdep-dry-run -- lodash

# allowlisted registry miss after -- is ok
printf '%s\n' '@myorg/private-pkg' > .phantomdep-allowlist
node "$HOOK" --phantomdep-dry-run -- @myorg/private-pkg
```

Expect a **block** finding for the unknown name. The lodash and allowlisted commands print `dry-run ok`.
