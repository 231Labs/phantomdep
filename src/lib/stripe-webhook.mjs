/**
 * PhantomDep Gate — Stripe *test* webhook.
 * Verifies the raw body with PHANTOMDEP_STRIPE_WEBHOOK_SECRET (whsec_…).
 * If PHANTOMDEP_STRIPE_SECRET_KEY is set and is not sk_test_, fail closed.
 * Seat persistence is a stub until Neon is wired.
 */
import Stripe from 'stripe';

/**
 * @param {{
 *   rawBody: string,
 *   signature: string | null,
 *   webhookSecret: string | undefined,
 *   secretKey: string | undefined,
 * }} input
 * @returns {{ status: number, body: { received?: true, error?: string } }}
 */
export function handleStripeWebhook({ rawBody, signature, webhookSecret, secretKey }) {
  if (secretKey && !secretKey.startsWith('sk_test_')) {
    return {
      status: 503,
      body: {
        error:
          'Webhook refused: PHANTOMDEP_STRIPE_SECRET_KEY must be a Stripe test key (sk_test_…). Live keys are not processed.',
      },
    };
  }

  if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    return {
      status: 400,
      body: {
        error:
          'Missing PHANTOMDEP_STRIPE_WEBHOOK_SECRET (whsec_… from a Stripe test-mode endpoint).',
      },
    };
  }

  if (!signature) {
    return { status: 400, body: { error: 'Missing Stripe signature.' } };
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return { status: 400, body: { error: 'Invalid Stripe signature.' } };
  }

  if (event?.type === 'checkout.session.completed') {
    // TODO: persist the private-repo seat when Neon is wired.
    console.info('[phantomdep] stripe checkout.session.completed', event.id ?? '');
  }

  return { status: 200, body: { received: true } };
}
