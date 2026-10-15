import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";
import { createInvoice } from "@/lib/payments";
import { getPlan, PLANS, RENEW_PRICE } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    coin?: string;
    net?: string;
    planKey?: string;
    upgradeFrom?: string;
    renew?: boolean;
  };

  // RENEWAL: existing/past vault members extend 30 days at the discounted
  // renewal price. Guard: never offered to active advice/coaching members
  // (renewing at the vault price would silently downgrade them), and the
  // member must have actually held a paid plan before.
  if (body.renew) {
    const active = await getActiveSubscription(user.id) as unknown as
      | { plan_key?: string | null; expires_at?: string | null }
      | null;
    if (active && active.plan_key !== "vault") {
      return NextResponse.json(
        { error: "Renewal pricing is only for the vault tier. Use the upgrade flow instead." },
        { status: 400 }
      );
    }
    const history = await db.execute({
      sql: "SELECT id FROM subscriptions WHERE user_id = ? AND plan_key IS NOT NULL AND plan_key != 'free' LIMIT 1",
      args: [user.id],
    });
    if (!history.rows.length) {
      return NextResponse.json(
        { error: "Renewals are only available to past members." },
        { status: 400 }
      );
    }
    const invoice = await createInvoice({
      userId: user.id,
      amount: RENEW_PRICE,
      planKey: "vault",
      coin: body.coin,
      net: body.net,
      renewal: true,
    });
    return NextResponse.json(invoice);
  }

  const plan = getPlan(body.planKey) || PLANS[0];
  // The price actually charged: promo salePrice when set, else the list price.
  const charged = (p: { price: number; salePrice?: number }) =>
    p.salePrice ?? p.price;

  // Upgrade flow: user only pays the prorated difference to the higher
  // tier (never a downgrade). Compute remaining value of the current
  // active sub and subtract it from the new plan's charged price.
  let amount = charged(plan);
  let upgradeFrom: string | null = null;
  if (body.upgradeFrom) {
    const cur = getPlan(body.upgradeFrom);
    const sub = await getActiveSubscription(user.id);
    if (cur && sub) {
      const daysTotal = cur.days || 30;
      const remaining = sub.expires_at
        ? Math.max(
            0,
            Math.ceil(
              (new Date(sub.expires_at.replace(" ", "T") + "Z").getTime() -
                Date.now()) /
                86400000
            )
          )
        : 0;
      const remainingValue = (charged(cur) * remaining) / daysTotal;
      amount = Math.max(0, Math.round((charged(plan) - remainingValue) * 100) / 100);
      upgradeFrom = cur.key;
    }
  }

  const invoice = await createInvoice({
    userId: user.id,
    amount,
    planKey: plan.key,
    coin: body.coin,
    net: body.net,
    upgradeFrom: upgradeFrom || undefined,
  });
  return NextResponse.json(invoice);
}
