import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Admin metrics for the weekly profit check (roadmap P2.4).
 * Returns light aggregates + raw date arrays (bucketed client-side into
 * weekly bars). Visitor counts live in Vercel Analytics, not the DB.
 */
export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  // Totals
  const users = await db.execute(`SELECT COUNT(*) AS c FROM users`);
  const totalUsers = Number((users.rows[0] as unknown as { c: number }).c);

  const paidEver = await db.execute(
    `SELECT COUNT(DISTINCT user_id) AS c FROM subscriptions
     WHERE plan_key IS NOT NULL AND plan_key != 'free' AND status IN ('active','cancelled')`
  );
  const paidEverCount = Number((paidEver.rows[0] as unknown as { c: number }).c);

  const activePaid = await db.execute(
    `SELECT COUNT(DISTINCT user_id) AS c FROM subscriptions
     WHERE plan_key IS NOT NULL AND plan_key != 'free' AND status = 'active'`
  );
  const activePaidCount = Number((activePaid.rows[0] as unknown as { c: number }).c);

  // Revenue: actual charged amounts on non-cancelled paid subs.
  const revenue = await db.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(CASE WHEN paid_at >= datetime('now', '-30 days') THEN amount ELSE 0 END), 0) AS last30
     FROM subscriptions
     WHERE plan_key IS NOT NULL AND plan_key != 'free' AND status = 'active'`
  );
  const rev = revenue.rows[0] as unknown as { total: number; last30: number };

  const byTier = await db.execute(
    `SELECT plan_key, COUNT(*) AS c, COALESCE(SUM(amount), 0) AS total
     FROM subscriptions
     WHERE plan_key IS NOT NULL AND plan_key != 'free' AND status = 'active'
     GROUP BY plan_key`
  );

  const renewals = await db.execute(
    `SELECT COUNT(*) AS c FROM subscriptions WHERE plan = 'renewal' AND status = 'active'`
  );
  const renewalCount = Number((renewals.rows[0] as unknown as { c: number }).c);

  // Date arrays for weekly bucketing (client-side).
  const signupDates = await db.execute(
    `SELECT created_at FROM users ORDER BY created_at ASC`
  );
  const purchaseRows = await db.execute(
    `SELECT paid_at, amount, plan_key FROM subscriptions
     WHERE plan_key IS NOT NULL AND plan_key != 'free' AND status = 'active' AND paid_at IS NOT NULL
     ORDER BY paid_at ASC`
  );

  return NextResponse.json({
    totalUsers,
    paidEverCount,
    activePaidCount,
    conversionPct: totalUsers ? Math.round((paidEverCount / totalUsers) * 1000) / 10 : 0,
    revenueTotal: Number(rev.total) || 0,
    revenueLast30: Number(rev.last30) || 0,
    byTier: byTier.rows.map((r) => {
      const row = r as unknown as { plan_key: string; c: number; total: number };
      return { planKey: row.plan_key, count: Number(row.c), revenue: Number(row.total) };
    }),
    renewals: renewalCount,
    signupDates: signupDates.rows.map((r) => (r as unknown as { created_at: string }).created_at),
    purchases: purchaseRows.rows.map((r) => {
      const row = r as unknown as { paid_at: string; amount: number; plan_key: string };
      return {
        paidAt: row.paid_at,
        amount: Number(row.amount) || 0,
        planKey: row.plan_key,
      };
    }),
  });
}
