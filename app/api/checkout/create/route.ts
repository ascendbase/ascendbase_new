import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";
import { createInvoice } from "@/lib/payments";
import { getPlan, PLANS } from "@/lib/plans";

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
  };
  const plan = getPlan(body.planKey) || PLANS[0];

  // Upgrade flow: user only pays the prorated difference to the higher
  // tier (never a downgrade). Compute remaining value of the current
  // active sub and subtract it from the new plan's full price.
  let amount = plan.price;
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
      const remainingValue = (cur.price * remaining) / daysTotal;
      amount = Math.max(0, Math.round((plan.price - remainingValue) * 100) / 100);
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
