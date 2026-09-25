import { NON_CLAIM_LONG, NON_CLAIM_SHORT } from '@/lib/claims';

const INSTALL = `# .github/workflows/phantomdep.yml
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
      - uses: 231Labs/phantomdep@main`;

export default function HomePage() {
  return (
    <main>
      <span className="badge">231 Labs · Preview</span>
      <h1>Block hallucinated dependencies before they install.</h1>
      <p className="hero-sub">
        CI gate: registry resolve + allowlist. Engineering findings, not an SCA suite.
      </p>

      <h2>Install the Action</h2>
      <pre>
        <code>{INSTALL}</code>
      </pre>
      <p className="muted">
        Fail-closed on npm names missing from the registry. Optional{' '}
        <code>.phantomdep-allowlist</code> overrides a miss after human verify. Week-1 ={' '}
        <strong>block</strong> only.
      </p>

      <h2>Private-repo seats</h2>
      <p className="note">
        Test seat price is configured via env. Checkout stays in Stripe test mode. No live
        Stripe keys until Al unlocks.
      </p>
      <form action="/api/checkout" method="post">
        <button className="btn" type="submit" disabled title="Requires Stripe test env">
          Checkout (test)
        </button>
      </form>

      <footer className="footer">
        <p>{NON_CLAIM_SHORT}</p>
        <p>{NON_CLAIM_LONG}</p>
        <p className="muted">phantomdep.231labs.com · trade name pending</p>
      </footer>
    </main>
  );
}
