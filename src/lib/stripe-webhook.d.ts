declare module '@/lib/stripe-webhook.mjs' {
  export function handleStripeWebhook(input: {
    rawBody: string;
    signature: string | null;
    webhookSecret: string | undefined;
    secretKey: string | undefined;
  }): {
    status: number;
    body: { received?: true; error?: string };
  };
}
