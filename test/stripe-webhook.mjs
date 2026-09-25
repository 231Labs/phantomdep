/**
 * Stripe test webhook: signature failures and live-key refusal.
 * No network — signatures are local HMAC via stripe.webhooks.
 */
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../src/lib/stripe-webhook.mjs';

const WHSEC = 'whsec_test_phantomdep_webhook';

function eventBody(type, id = 'evt_test_1') {
  return JSON.stringify({
    id,
    object: 'event',
    type,
    data: { object: { id: 'cs_test_1', object: 'checkout.session' } },
  });
}

function sign(payload, secret = WHSEC) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}

function withInfo(fn) {
  const lines = [];
  const orig = console.info;
  console.info = (...args) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    return { result: fn(), lines };
  } finally {
    console.info = orig;
  }
}

describe('handleStripeWebhook', () => {
  it('returns 400 when the webhook secret is missing', () => {
    const res = handleStripeWebhook({
      rawBody: eventBody('checkout.session.completed'),
      signature: 't=1,v1=deadbeef',
      webhookSecret: undefined,
      secretKey: 'sk_test_ok',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /PHANTOMDEP_STRIPE_WEBHOOK_SECRET/);
    assert.equal(res.body.received, undefined);
  });

  it('returns 400 when the webhook secret is not a whsec_ signing secret', () => {
    const res = handleStripeWebhook({
      rawBody: '{}',
      signature: 't=1,v1=deadbeef',
      webhookSecret: 'sk_test_not_a_webhook_secret',
      secretKey: undefined,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.received, undefined);
  });

  it('returns 400 when the Stripe signature header is missing', () => {
    const res = handleStripeWebhook({
      rawBody: eventBody('checkout.session.completed'),
      signature: null,
      webhookSecret: WHSEC,
      secretKey: undefined,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /signature/i);
  });

  it('returns 400 when the signature does not match the raw body', () => {
    const payload = eventBody('checkout.session.completed', 'evt_bad_sig');
    const res = handleStripeWebhook({
      rawBody: payload,
      signature: sign(payload, 'whsec_different_secret'),
      webhookSecret: WHSEC,
      secretKey: 'sk_test_ok',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid Stripe signature/);
    assert.equal(res.body.received, undefined);
  });

  it('fails closed on a live secret key and does not ack the event', () => {
    const payload = eventBody('checkout.session.completed', 'evt_live_held');
    const { result, lines } = withInfo(() =>
      handleStripeWebhook({
        rawBody: payload,
        signature: sign(payload),
        webhookSecret: WHSEC,
        secretKey: 'sk_live_not_allowed',
      }),
    );
    assert.equal(result.status, 503);
    assert.match(result.body.error, /sk_test_/);
    assert.equal(result.body.received, undefined);
    assert.equal(lines.length, 0);
  });

  it('fails closed on a live key even when the webhook secret is missing', () => {
    const res = handleStripeWebhook({
      rawBody: '{}',
      signature: null,
      webhookSecret: undefined,
      secretKey: 'sk_live_not_allowed',
    });
    assert.equal(res.status, 503);
  });

  it('acks checkout.session.completed after a valid test signature', () => {
    const payload = eventBody('checkout.session.completed', 'evt_test_completed');
    const { result, lines } = withInfo(() =>
      handleStripeWebhook({
        rawBody: payload,
        signature: sign(payload),
        webhookSecret: WHSEC,
        secretKey: 'sk_test_ok',
      }),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { received: true });
    assert.ok(
      lines.some((line) => line.includes('checkout.session.completed') && line.includes('evt_test_completed')),
    );
  });

  it('acks a verified event when the test secret key is unset', () => {
    const payload = eventBody('checkout.session.completed', 'evt_no_api_key');
    const { result } = withInfo(() =>
      handleStripeWebhook({
        rawBody: payload,
        signature: sign(payload),
        webhookSecret: WHSEC,
        secretKey: undefined,
      }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.received, true);
  });

  it('acks other verified event types without the seat log', () => {
    const payload = eventBody('customer.created', 'evt_other');
    const { result, lines } = withInfo(() =>
      handleStripeWebhook({
        rawBody: payload,
        signature: sign(payload),
        webhookSecret: WHSEC,
        secretKey: 'sk_test_ok',
      }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.received, true);
    assert.equal(
      lines.some((line) => line.includes('checkout.session.completed')),
      false,
    );
  });
});

describe('checkout copy', () => {
  it('does not leave seat price TBD on the checkout note or landing', () => {
    const route = readFileSync(new URL('../src/app/api/checkout/route.ts', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(route, /Seat price TBD/);
    assert.doesNotMatch(page, /Seat price TBD/);
    assert.match(route, /configured via PHANTOMDEP_STRIPE_PRICE_SEAT/);
    assert.match(page, /\$29 \/ seat \/ month \(Stripe TEST\)/);
  });
});
