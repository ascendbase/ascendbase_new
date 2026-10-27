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

  // Full ledger: every payment ever (active, cancelled, failed, pending),
  // joined to the member email. Includes all statuses so the admin can see
  // every attempt, not just successful ones.
  const paymentLedger = await db.execute(
    `SELECT s.order_id, u.email, s.plan_key, s.amount, s.coin, s.network,
            s.tx_hash, s.status, s.paid_at, s.created_at, s.expires_at,
            COALESCE((SELECT i.renewal FROM invoices i WHERE i.order_id = s.order_id), 0) AS renewal
     FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.plan_key IS NOT NULL AND s.plan_key != 'free'
     ORDER BY COALESCE(s.paid_at, s.created_at) DESC`
  );

  // Lava invoices that haven't converted to subscriptions yet (pending/failed
  // webhooks) — these are payment attempts that never produced a subscription.
  const lavaAttempts = await db.execute(
    `SELECT i.contract_id, i.order_id, i.plan_key, i.amount, i.status,
            i.created_at, u.email
     FROM invoices i JOIN users u ON u.id = i.user_id
     WHERE i.provider = 'lava' AND i.contract_id IS NOT NULL
       AND i.status != 'paid'
     ORDER BY i.created_at DESC`
  );

  // Current subscriber roster: latest active paid sub per user. Rows whose
  // expires_at has passed are excluded (some old rows stay flagged 'active'
  // forever — the expiry timestamp is the truth, not the status flag).
  const subscriberRows = await db.execute(
    `SELECT s.user_id, u.email, s.plan_key, s.amount, s.order_id, s.tx_hash,
            s.network, s.paid_at, s.expires_at
     FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'active' AND s.plan_key IS NOT NULL AND s.plan_key != 'free'
       AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
     ORDER BY s.expires_at ASC`
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
    // Full payment ledger: every confirmed payment with member email, tier,
    // amount, network, tx hash, dates. Newest first.
    payments: paymentLedger.rows.map((r) => {
      const row = r as unknown as {
        order_id: string | null;
        email: string;
        plan_key: string | null;
        amount: number;
        coin: string | null;
        network: string | null;
        tx_hash: string | null;
        status: string;
        paid_at: string | null;
        created_at: string;
        expires_at: string | null;
        renewal: number | null;
      };
      return {
        orderId: row.order_id,
        email: row.email,
        planKey: row.plan_key,
        amount: Number(row.amount) || 0,
        coin: row.coin,
        network: row.network,
        txHash: row.tx_hash,
        status: row.status,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        renewal: !!row.renewal,
      };
    }),
    // Lava payment attempts that haven't confirmed yet (pending/failed).
    lavaAttempts: lavaAttempts.rows.map((r) => {
      const row = r as unknown as {
        contract_id: string;
        order_id: string;
        plan_key: string | null;
        amount: number;
        status: string;
        created_at: string;
        email: string;
      };
      return {
        contractId: row.contract_id,
        orderId: row.order_id,
        planKey: row.plan_key,
        amount: Number(row.amount) || 0,
        status: row.status,
        createdAt: row.created_at,
        email: row.email,
      };
    }),
    // Subscriber roster: everyone who currently holds paid access, with
    // tier, paid date, expiry, days left and payment details.
    subscribers: subscriberRows.rows.map((r) => {
      const row = r as unknown as {
        user_id: number;
        email: string;
        plan_key: string | null;
        amount: number;
        order_id: string | null;
        tx_hash: string | null;
        network: string | null;
        paid_at: string | null;
        expires_at: string | null;
      };
      let daysLeft: number | null = null;
      if (row.expires_at) {
        const exp = new Date(row.expires_at.replace(" ", "T") + "Z").getTime();
        if (!isNaN(exp)) daysLeft = Math.ceil((exp - Date.now()) / 86400000);
      }
      return {
        userId: row.user_id,
        email: row.email,
        planKey: row.plan_key,
        amount: Number(row.amount) || 0,
        orderId: row.order_id,
        txHash: row.tx_hash,
        network: row.network,
        paidAt: row.paid_at,
        expiresAt: row.expires_at,
        daysLeft,
      };
    }),
  });
}
