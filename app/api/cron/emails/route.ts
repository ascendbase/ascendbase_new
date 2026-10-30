import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RENEW_PRICE } from "@/lib/plans";
import { SITE_URL } from "@/lib/seo";
import {
  emailConfigured,
  isOptedOut,
  renewalReminderEmailHtml,
  sendEmail,
  winbackEmailHtml,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily email automation (Vercel cron): 
 *  - renewal_reminder: paid members whose vault access expires within 7 days
 *    (reminded at most once per 30-day cycle)
 *  - winback: paid members whose access expired 2–10 days ago (once, ever
 *    recent — deduped by a 30-day lookback)
 *
 * Auth: Vercel cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 * An admin session also works (lets you trigger it manually from the browser).
 */

function fmtExpiry(s: string): number {
  const d = new Date(s.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

async function recentlySent(email: string, kind: string): Promise<boolean> {
  // Any send of this kind within the last 30 days counts as "already done"
  // for the current 30-day cycle (cheap dedupe, no extra state needed).
  const r = await db.execute({
    sql: `SELECT 1 FROM email_log
          WHERE email = ? AND kind = ? AND status = 'sent'
            AND created_at > datetime('now', '-30 days')
          LIMIT 1`,
    args: [email, kind],
  });
  return r.rows.length > 0;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const tokenOk = secret && auth === `Bearer ${secret}`;
  if (!tokenOk && session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await initDb();
  if (!emailConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "Email not configured (RESEND_API_KEY / EMAIL_FROM missing)." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Latest non-free subscription per user (both active and expired).
  const subs = await db.execute({
    sql: `SELECT s.user_id, s.plan_key, s.expires_at, u.email
          FROM subscriptions s JOIN users u ON u.id = s.user_id
          WHERE s.plan_key IS NOT NULL AND s.plan_key != 'free' AND s.plan_key != 'morphs'
            AND s.expires_at IS NOT NULL
          GROUP BY s.user_id
          HAVING MAX(s.expires_at) = s.expires_at`,
    args: [],
  });

  let reminders = 0, winbacks = 0, skipped = 0;
  const details: { email: string; kind: string; result: string }[] = [];

  for (const raw of subs.rows) {
    const row = raw as unknown as { user_id: number; plan_key: string; expires_at: string; email: string };
    const expMs = fmtExpiry(row.expires_at);
    if (!expMs) continue;
    const daysLeft = Math.ceil((expMs - now) / DAY);

    let kind: "renewal_reminder" | "winback" | null = null;
    if (daysLeft > 0 && daysLeft <= 7) kind = "renewal_reminder";
    else if (daysLeft < 0 && daysLeft >= -10) kind = "winback";
    if (!kind) continue;

    if (await isOptedOut(row.email)) { skipped++; continue; }
    if (await recentlySent(row.email, kind)) { skipped++; continue; }

    const renewUrl = `${SITE_URL}/checkout?renew=1`;
    const subject = kind === "renewal_reminder"
      ? `${daysLeft} days left in the vault — renew for $${RENEW_PRICE}`
      : "Your vault access expired — reopen for $7";

    const r = await sendEmail({
      userId: row.user_id,
      to: row.email,
      subject,
      html: kind === "renewal_reminder"
        ? renewalReminderEmailHtml(daysLeft, renewUrl)
        : winbackEmailHtml(renewUrl),
      kind,
    });
    if (r.ok) {
      if (kind === "renewal_reminder") reminders++; else winbacks++;
      details.push({ email: row.email, kind, result: "sent" });
    } else {
      details.push({ email: row.email, kind, result: "failed" });
    }
    // Resend free tier rate limit safety (~2 req/s).
    await new Promise((r) => setTimeout(r, 700));
  }

  return NextResponse.json({ ok: true, reminders, winbacks, skipped, details });
}
