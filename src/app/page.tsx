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

const ALLOWLIST = `# .phantomdep-allowlist
@myorg/private-pkg`;

type CheckoutLanding = 'success' | 'cancel' | null;

function checkoutLanding(value: string | string[] | undefined): CheckoutLanding {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'success' || raw === 'cancel') return raw;
  return null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const landing = checkoutLanding((await searchParams).checkout);

  return (
    <main>
      <span className="badge">231 Labs · Preview</span>
      {landing === 'success' ? (
        <p className="note" role="status">
          <strong>TEST Checkout completed.</strong> Seats are still Preview — no live billing.
        </p>
      ) : null}
      {landing === 'cancel' ? (
        <p className="note" role="status">
          Checkout canceled. Retry the test Checkout button below when you want to continue.
        </p>
      ) : null}
      <h1>Block hallucinated dependencies before they install.</h1>
      <p className="hero-sub">
        PhantomDep Gate is a CI Action that fails the job when a dependency name is
        missing from the npm registry or outside your allowlist — and leaves an
        engineering punch list (name, evidence, <strong>block</strong>).
      </p>

      <ul className="benefits">
        <li>
          <strong>Stop phantom packages at PR time</strong> — names that don’t resolve on
          the registry never quietly merge.
        </li>
        <li>
          <strong>Enforce an allowlist you control</strong> — private or vetted packages
          pass only when listed.
        </li>
        <li>
          <strong>Get a punch list, not a PDF</strong> — each finding: package · evidence ·{' '}
          <strong>block</strong> · next step.
        </li>
        <li>
          <strong>Ship in minutes</strong> — one GitHub Action on <code>pull_request</code>;
          week-1 = block only (no warn noise).
        </li>
      </ul>

      <figure className="demo">
        <figcaption>
          <strong>Demo (Preview)</strong>
        </figcaption>
        <img
          src="/demo/phantomdep-gate-20s.gif"
          alt="Demo (Preview): add the PhantomDep Gate workflow, a pull request adds @corp/phantom-widget, the gate reports an npm registry miss and blocks, then a punch-list finding."
          width={1200}
          height={675}
        />
      </figure>

      <h2>How it works</h2>
      <ol className="steps">
        <li>
          <strong>Add the Action</strong> to your repo’s <code>pull_request</code> workflow.
        </li>
        <li>
          <strong>Open a PR</strong> that adds or changes npm dependencies.
        </li>
        <li>
          <strong>Gate runs</strong> — registry resolve + optional <code>.phantomdep-allowlist</code>.
        </li>
        <li>
          <strong>Miss → block</strong> — CI fails; PR comment lists findings. Pass → green.
        </li>
      </ol>

      <section className="limits" aria-labelledby="not-heading">
        <h2 id="not-heading">What it is not</h2>
        <p>
          PhantomDep Gate is <strong>not</strong> an SCA platform, <strong>not</strong> a malware
          or vulnerability scanner, and <strong>not</strong> a promise that allowlisted packages
          are safe. It checks <strong>registry existence</strong> and <strong>your allowlist</strong>{' '}
          — then blocks.
        </p>
      </section>

      <h2>Private-repo seats — $29 / seat / month (Stripe TEST)</h2>
      {landing === 'success' ? (
        <p className="helper muted">Test mode · no live billing · Preview</p>
      ) : (
        <>
          <p className="note">
            Checkout opens Stripe <strong>test</strong> mode for private seats. Live keys and
            Production announce held until Al unlocks.
          </p>
          <form action="/api/checkout" method="post">
            <button className="btn" type="submit">
              Start test Checkout
            </button>
          </form>
          <p className="helper muted">Test mode · no live billing · Preview</p>
        </>
      )}

      <details className="install">
        <summary>Install snippet</summary>
        <pre>
          <code>{INSTALL}</code>
        </pre>
        <p className="muted">Optional allowlist</p>
        <pre>
          <code>{ALLOWLIST}</code>
        </pre>
      </details>

      <footer className="footer">
        <p>{NON_CLAIM_SHORT}</p>
        <p>{NON_CLAIM_LONG}</p>
        <p className="muted">phantomdep.231labs.com · 231 Labs · trade name pending · Preview</p>
      </footer>
    </main>
  );
}
