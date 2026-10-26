import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";
import { getPlan, RENEW_PRICE } from "@/lib/plans";
import { createLavaInvoice, lavaConfigured, lavaOfferIdFor } from "@/lib/lava";

export const runtime = "nodejs";

/**
 * Card payment via Lava.top (merchant of record — cards, SBP, etc.).
 *
 * Flow:
 *  1. Member picks a plan (or a renewal) and clicks "Pay with card".
 *  2. We create a Lava contract (invoice) for the right offer, store its
 *     contractId on our invoices row (provider='lava'), and return the
 *     hosted payment page URL.
 *  3. Buyer pays on Lava's page → Lava POSTs our webhook
 *     (/api/webhooks/lava) with payment.success + contractId.
 *  4. Webhook matches the contract id, creates the pending subscription
 *     row and confirms it — access activates instantly, no admin step.
 *
 * Return URLs land on /checkout?lava_return=<orderId>; the checkout page
 * polls /api/auth/me and flips to the vault as soon as the sub is active.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    planKey?: string;
    renew?: boolean;
  };
  if (!lavaConfigured())
    return NextResponse.json(
      { error: "Card payments are not available right now. Use crypto instead." },
      { status: 503 }
    );

  // Renewal: extend 30 days at the member price, reuses the vault offer.
  const isRenewal = !!body.renew;
  const planKey = isRenewal ? "vault" : body.planKey || "";
  const plan = getPlan(planKey);
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  // Renewals are for existing members; fresh purchases must not already
  // hold an active paid sub (use ?upgrade= for that).
  const active = (await getActiveSubscription(user.id)) as unknown as
    | { plan_key?: string | null; expires_at?: string | null }
    | null;
  if (isRenewal && !active) {
    return NextResponse.json({ error: "No active subscription to renew." }, { status: 400 });
  }
  if (!isRenewal && active && active.plan_key !== "vault") {
    return NextResponse.json(
      { error: "You already have an active plan. Use the upgrade page instead." },
      { status: 400 }
    );
  }

  const offerId = lavaOfferIdFor(planKey);
  if (!offerId)
    return NextResponse.json(
      { error: "This plan is not set up for card payments yet." },
      { status: 503 }
    );

  const origin = process.env.SITE_URL || new URL(req.url).origin;
  const orderId = "ab_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const amount = isRenewal ? RENEW_PRICE : plan.price;

  let inv;
  try {
    inv = await createLavaInvoice({
      offerId,
      email: user.email,
      amount, // dynamic-price offers only; ignored otherwise
      successUrl: `${origin}/checkout?lava_return=${orderId}`,
      failureUrl: `${origin}/checkout?lava_failed=${orderId}`,
      cancelUrl: `${origin}/checkout?lava_failed=${orderId}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payment provider error." },
      { status: 502 }
    );
  }

  // Persist the mapping: webhook contract id -> our order + plan + user.
  await db.execute({
    sql: `INSERT INTO invoices (order_id, user_id, plan_key, amount, coin, net, address, status, contract_id, provider, renewal)
          VALUES (?, ?, ?, ?, 'USD', 'card', '-', 'open', ?, 'lava', ?)`,
    args: [orderId, user.id, planKey, amount, inv.id, isRenewal ? 1 : 0],
  });

  return NextResponse.json({
    url: inv.paymentUrl,
    orderId,
    contractId: inv.id,
  });
}
