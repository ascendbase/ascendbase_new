import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  broadcastEmailHtml,
  emailConfigured,
  isOptedOut,
  sendEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin broadcast emails (Email tab).
 * GET  → recent email log + audience counts
 * POST → send broadcast to a segment (all | free | paid | expired | test)
 *        with resumable batching (limit + 7-day per-subject dedupe).
 */

function fmtExpiry(s: string | null): number {
  if (!s) return 0;
  const d = new Date(s.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") return null;
  return s;
}

/** All users with their latest subscription expiry (null = never paid). */
async function loadAudience(): Promise<{ email: string; userId: number; latestExpiry: string | null; paid: boolean }[]> {
  const users = await db.execute({
    sql: `SELECT u.id, u.email, MAX(s.expires_at) AS latest_expiry,
                 MAX(CASE WHEN s.plan_key IS NOT NULL AND s.plan_key != 'free' THEN 1 ELSE 0 END) AS ever_paid
          FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
          GROUP BY u.id, u.email`,
    args: [],
  });
  return users.rows.map((r) => {
    const row = r as unknown as { id: number; email: string; latest_expiry: string | null; ever_paid: number };
    return {
      email: row.email,
      userId: row.id,
      latestExpiry: row.latest_expiry,
      paid: !!row.ever_paid,
    };
  });
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await initDb();
  const audience = await loadAudience();
  const now = Date.now();
  const counts = {
    all: audience.length,
    free: 0,
    paid: 0,
    expired: 0,
  };
  for (const a of audience) {
    if (!a.paid) counts.free++;
    else {
      counts.paid++;
      const exp = fmtExpiry(a.latestExpiry);
      if (exp && exp < now) counts.expired++;
    }
  }
  const optouts = await db.execute({ sql: "SELECT COUNT(*) AS c FROM email_optouts", args: [] });
  const log = await db.execute({
    sql: "SELECT email, kind, subject, status, error, created_at FROM email_log ORDER BY id DESC LIMIT 50",
    args: [],
  });
  return NextResponse.json({
    counts,
    optouts: Number((optouts.rows[0] as unknown as { c: number }).c),
    configured: emailConfigured(),
    log: log.rows,
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await initDb();
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured. Set RESEND_API_KEY and EMAIL_FROM in Vercel env vars first." },
      { status: 400 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    segment?: "all" | "free" | "paid" | "expired" | "test";
    subject?: string;
    text?: string;
    title?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    testEmail?: string;
    /** Max recipients per run — resumable batching (Resend free tier = 100/day, Vercel fn timeout 60s). */
    limit?: number;
  };
  const segment = body.segment || "all";
  const subject = (body.subject || "").trim();
  const text = (body.text || "").trim();
  const title = (body.title || subject).trim();
  if (!subject || !text) {
    return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  }

  const html = broadcastEmailHtml(title, text, body.ctaLabel, body.ctaUrl);

  if (segment === "test") {
    const to = (body.testEmail || "").trim();
    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "A valid test email is required." }, { status: 400 });
    }
    const r = await sendEmail({ to, subject, html, kind: "broadcast", withUnsubscribe: true });
    return NextResponse.json({ ok: r.ok, sent: r.ok ? 1 : 0, total: 1, failures: r.ok ? [] : [{ email: to, error: r.error }] });
  }

  const audience = await loadAudience();
  const now = Date.now();
  const recipients = audience.filter((a) => {
    if (!a.email || !a.email.includes("@")) return false;
    if (segment === "all") return true;
    if (!a.paid) return segment === "free";
    if (segment === "paid") return true;
    if (segment === "expired") {
      const exp = fmtExpiry(a.latestExpiry);
      return exp > 0 && exp < now;
    }
    return false;
  });

  // Resumable batching: skip everyone this exact subject was already
  // successfully sent to within 7 days — re-running the same campaign
  // continues where the previous run left off instead of double-sending.
  const already = await db.execute({
    sql: `SELECT DISTINCT email FROM email_log
          WHERE subject = ? AND kind = 'broadcast' AND status = 'sent'
            AND created_at > datetime('now', '-7 days')`,
    args: [subject],
  });
  const sentSet = new Set(
    already.rows.map((r) => (r as unknown as { email: string }).email)
  );

  let sent = 0, failed = 0, skipped = 0;
  const failures: { email: string; error?: string }[] = [];
  const pending = recipients.filter((r) => !sentSet.has(r.email));
  const limit = Math.max(1, Math.min(Number(body.limit) || pending.length, pending.length));
  const batch = pending.slice(0, limit);
  for (const r of batch) {
    if (await isOptedOut(r.email)) { skipped++; continue; }
    const res = await sendEmail({
      userId: r.userId,
      to: r.email,
      subject,
      html,
      kind: "broadcast",
      withUnsubscribe: true,
    });
    if (res.ok) sent++;
    else { failed++; failures.push({ email: r.email, error: res.error }); }
    // Resend free tier allows ~2 req/s. Keep each run well under the 60s
    // Vercel function limit — the client UI auto-continues with more runs
    // until `remaining` reaches 0, so no batch ever dies mid-send.
    await new Promise((res) => setTimeout(res, 500));
  }

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    skipped,
    total: batch.length,
    failures,
    remaining: Math.max(0, pending.length - batch.length),
  });
}

