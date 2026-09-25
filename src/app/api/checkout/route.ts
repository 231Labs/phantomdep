import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * Stripe *test* Checkout scaffold for private-repo seats.
 * Price id is an env placeholder — do not invent a seat price.
 * Live keys / Production: Al unlock only.
 */
export async function POST(req: Request) {
  const secret = process.env.PHANTOMDEP_STRIPE_SECRET_KEY;
  const price = process.env.PHANTOMDEP_STRIPE_PRICE_SEAT;

  if (!secret || !secret.startsWith('sk_test_')) {
    return NextResponse.json(
      {
        error:
          'Checkout not configured: set PHANTOMDEP_STRIPE_SECRET_KEY to a Stripe test key (sk_test_…). Live keys held.',
      },
      { status: 503 },
    );
  }
  if (!price || !price.startsWith('price_')) {
    return NextResponse.json(
      {
        error:
          'Checkout not configured: PHANTOMDEP_STRIPE_PRICE_SEAT pending (Al sets seat price — do not invent).',
      },
      { status: 503 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/?checkout=success&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/?checkout=cancel`,
    metadata: { product: 'phantomdep_seat' },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe session missing url' }, { status: 502 });
  }
  return NextResponse.redirect(session.url, 303);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(
      process.env.PHANTOMDEP_STRIPE_SECRET_KEY?.startsWith('sk_test_') &&
        process.env.PHANTOMDEP_STRIPE_PRICE_SEAT?.startsWith('price_'),
    ),
    note: 'POST to start test Checkout. Seat price TBD.',
  });
}
