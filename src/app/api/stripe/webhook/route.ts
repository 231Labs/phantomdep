import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe-webhook.mjs';

export const runtime = 'nodejs';

/**
 * Stripe *test* webhook for private-repo seats.
 * Raw body + Stripe-Signature verified with PHANTOMDEP_STRIPE_WEBHOOK_SECRET.
 * Live keys (PHANTOMDEP_STRIPE_SECRET_KEY not sk_test_…) are refused.
 * Seat persistence is a stub until Neon is wired.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const result = handleStripeWebhook({
    rawBody,
    signature: req.headers.get('stripe-signature'),
    webhookSecret: process.env.PHANTOMDEP_STRIPE_WEBHOOK_SECRET,
    secretKey: process.env.PHANTOMDEP_STRIPE_SECRET_KEY,
  });
  return NextResponse.json(result.body, { status: result.status });
}
