import { db } from "./db";

/**
 * Minimal Lava.top API client (dev.lava.top).
 *
 * Auth: X-Api-Key header. Base: https://api.lava.top
 * Create invoice: POST /api/v3/invoice
 *   body: { email, offerId, currency, successful_return_url, ... }
 *   resp: { id, status, amountTotal, paymentUrl }
 *
 * Webhooks POST to our /api/webhooks/lava with:
 *   { eventType: "payment.success" | "payment.failed" |
 *               "subscription.recurring.payment.success" | ...,
 *     contractId, parentContractId?, buyer: { email }, amount, currency,
 *     status, timestamp, errorMessage }
 * Auth: X-Api-Key header (same account key) — verified server-side.
 */

const LAVA_BASE = "https://gate.lava.top";

export type LavaInvoice = {
  id: string;
  status: string;
  amountTotal?: { amount: number; currency: string } | null;
  paymentUrl: string | null;
};

export function lavaConfigured(): boolean {
  return !!process.env.LAVA_API_KEY;
}

/** Map a local plan key to the Lava offer id configured in the dashboard. */
export function lavaOfferIdFor(planKey: string): string | null {
  const map: Record<string, string | undefined> = {
    vault: process.env.LAVA_OFFER_VAULT,
    advice: process.env.LAVA_OFFER_ADVICE,
    coaching: process.env.LAVA_OFFER_COACHING,
  };
  return map[planKey] || null;
}

/**
 * Create a Lava invoice (contract) for a purchase and return the hosted
 * payment page URL the buyer should be redirected to.
 * Currency: Lava bills in USD for our USD-priced products; buyers can pay
 * with whatever method Lava's checkout offers them (cards, SBP, etc.).
 */
export async function createLavaInvoice(opts: {
  offerId: string;
  email: string;
  amount?: number;
  successUrl?: string;
  failureUrl?: string;
  cancelUrl?: string;
}): Promise<LavaInvoice> {
  const key = process.env.LAVA_API_KEY;
  if (!key) throw new Error("LAVA_API_KEY not configured.");

  const body: Record<string, unknown> = {
    email: opts.email,
    offerId: opts.offerId,
    currency: "USD",
  };
  // NOTE: `amount` is NOT sent — all offers are fixed-price in the Lava
  // dashboard. Sending `amount` to a non-dynamic offer causes a 400 error
  // ("is not dynamic price"). The offer's dashboard price is used instead.
  if (opts.successUrl) body.successful_return_url = opts.successUrl;
  if (opts.failureUrl) body.failure_return_url = opts.failureUrl;
  if (opts.cancelUrl) body.cancel_return_url = opts.cancelUrl;

  const res = await fetch(`${LAVA_BASE}/api/v3/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as
    | LavaInvoice
    | { error?: string; details?: unknown };

  if (!res.ok) {
    const msg =
      (data as { error?: string }).error ||
      `Lava invoice creation failed (${res.status})`;
    throw new Error(msg);
  }
  const inv = data as LavaInvoice;
  if (!inv.id || !inv.paymentUrl) {
    throw new Error("Lava invoice response missing id/paymentUrl.");
  }
  return inv;
}

/** Look up a contract by id (used to re-check status if a webhook is missed). */
export async function getLavaInvoice(
  contractId: string
): Promise<LavaInvoice | null> {
  const key = process.env.LAVA_API_KEY;
  if (!key) return null;
  const res = await fetch(`${LAVA_BASE}/api/v1/invoices/${contractId}`, {
    headers: { "X-Api-Key": key },
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as LavaInvoice | null;
}
