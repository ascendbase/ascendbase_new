import { db } from "./db";
import { SITE_NAME, SITE_URL } from "./seo";

/**
 * Email infrastructure — Resend via plain fetch (no SDK dependency).
 *
 * Env vars (Vercel):
 *   RESEND_API_KEY  — re_xxx from resend.com/api-keys
 *   EMAIL_FROM      — "Ascendbase <hello@ascendbase.pro>" (must use a verified domain)
 *
 * All sends are fire-and-forget safe: callers never await a failure, and
 * every attempt is logged to the email_log table for the admin Email tab.
 * Unsubscribe handling: every broadcast carries a one-click /api/unsubscribe
 * link; opted-out users are skipped everywhere.
 */

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export type EmailKind = "welcome" | "renewal_reminder" | "winback" | "broadcast";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  userId?: number;
  /** Broadcasts include the one-click unsubscribe link. */
  withUnsubscribe?: boolean;
};

/** Wrap content in a dark, brand-consistent HTML shell (inline styles only — email clients ignore CSS). */
function shell(inner: string, unsubLink?: string): string {
  const unsub = unsubLink
    ? `<p style="margin:24px 0 0;text-align:center;font-size:11px;color:#666">
         <a href="${unsubLink}" style="color:#888">Don't want these emails?</a>
       </p>`
    : "";
  // Open/click tracking is handled natively by Resend (enable it in the
  // Resend dashboard under Domains → Configuration → Enable tracking metrics).
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#121212;border:1px solid #262626;border-radius:16px;padding:32px 28px;color:#e5e5e5;">
      <div style="text-align:center;margin:0 0 20px;">
        <img src="${SITE_URL}/email_logo.png" alt="${SITE_NAME}" width="120" style="display:block;margin:0 auto;border:0" />

      </div>
      ${inner}
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#555">${SITE_NAME}</p>
    ${unsub}
  </div>
</body></html>`;
}

/** One-click unsubscribe: cookie-free, keyed on email via an obfuscated token. */
export function unsubscribeToken(email: string): string {
  return Buffer.from(email).toString("base64url");
}

async function logEmail(userId: number | undefined, to: string, kind: EmailKind, subject: string, status: string, error?: string): Promise<number | null> {
  try {
    const r = await db.execute({
      sql: "INSERT INTO email_log (user_id, email, kind, subject, status, error) VALUES (?, ?, ?, ?, ?, ?)",
      args: [userId ?? null, to, kind, subject, status, error ?? null],
    });
    return Number(r.lastInsertRowid) || null;
  } catch {
    // logging must never break sending
    return null;
  }
}

async function markEmailStatus(id: number | null, status: string, error?: string): Promise<void> {
  if (!id) return;
  try {
    await db.execute({
      sql: "UPDATE email_log SET status = ?, error = ? WHERE id = ?",
      args: [status, error ?? null, id],
    });
  } catch {
    // ignore
  }
}

export async function isOptedOut(email: string): Promise<boolean> {
  const r = await db.execute({
    sql: "SELECT 1 FROM email_optouts WHERE email = ?",
    args: [email],
  });
  return r.rows.length > 0;
}

export async function sendEmail(a: SendArgs): Promise<boolean> {
  if (!emailConfigured()) {
    await logEmail(a.userId, a.to, a.kind, a.subject, "skipped", "email not configured");
    return false;
  }
  if (a.withUnsubscribe && (await isOptedOut(a.to))) {
    await logEmail(a.userId, a.to, a.kind, a.subject, "skipped", "opted out");
    return false;
  }
  try {
    const unsubLink = a.withUnsubscribe
      ? `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken(a.to)}`
      : undefined;
    // Log row first (the admin Email tab reads it).
    const logId = await logEmail(a.userId, a.to, a.kind, a.subject, "queued");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        // Replies land in the From mailbox (forwarded to the owner's inbox).
        reply_to: process.env.EMAIL_FROM,
        to: [a.to],
        subject: a.subject,
        html: shell(a.html, unsubLink),
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      await markEmailStatus(logId, "failed", `HTTP ${res.status}: ${err.slice(0, 200)}`);
      return false;
    }
    await markEmailStatus(logId, "sent");
    return true;
  } catch (e) {
    await logEmail(a.userId, a.to, a.kind, a.subject, "failed", String(e).slice(0, 200));
    return false;
  }
}


/* ------------------------- TEMPLATES ------------------------- */

/** Sent right after signup. Sells the advice tier — the flagship. */
export function welcomeEmailHtml(): string {
  return `
  <h1 style="margin:0 0 12px;font-size:22px;color:#fff">Your account is live.</h1>
  <p style="margin:0 0 16px;line-height:1.7;color:#ccc">
    You now have free access to the vault — a curated set of looksmaxing fundamentals.
    But reading theory is the slow path.
  </p>
  <p style="margin:0 0 16px;line-height:1.7;color:#ccc">
    One thing before you start: <b style="color:#fff">just hit reply to this email</b> if you
    have any question about looksmaxing or where to begin. It lands directly in my
    inbox — I read every reply and answer personally.
  </p>
  <p style="margin:0 0 16px;line-height:1.7;color:#ccc">
    What actually moves the needle is knowing <b style="color:#fff">what's wrong with YOUR face</b> —
    your specific flaws, your ratios, your harmony score, and the order to fix them in.
  </p>
  <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:20px 0">
    <p style="margin:0 0 8px;font-weight:700;color:#fff">Personal Looksmaxing Advice — $49</p>
    <ul style="margin:0;padding-left:18px;color:#bbb;font-size:13px;line-height:1.8">
      <li>Full list of your individual facial flaws</li>
      <li>Your personal ratios + harmony score package</li>
      <li>Custom face morphs with 2 intensity options</li>
      <li>Direct line to me — Q&amp;A until you understand every detail</li>
    </ul>
  </div>
  <a href="${SITE_URL}/checkout?plan=advice"
     style="display:inline-block;margin:8px 0 16px;background:#22c55e;color:#0a0a0a;font-weight:700;font-size:14px;
            padding:12px 28px;border-radius:10px;text-decoration:none">
    Get my personal evaluation →
  </a>
  <p style="margin:16px 0 0;font-size:13px;color:#888;line-height:1.6">
    Not ready yet? Score your face free first:
    <a href="${SITE_URL}/ratios" style="color:#4ade80">${SITE_URL.replace("https://", "")}/ratios</a>
  </p>
  <p style="margin:16px 0 0;font-size:12px;color:#777;line-height:1.6">
    P.S. This address only emails when there's something actually worth your time.
    Drag this email into your Primary tab (or add me to contacts) so future drops
    don't get buried — and just hit reply if you have a question. I read every reply.
  </p>`;
}

/** Vault members ~7 days before expiry. One click to renew at member price. */
export function renewalReminderEmailHtml(daysLeft: number, renewUrl: string): string {
  return `
  <h1 style="margin:0 0 12px;font-size:22px;color:#fff">${daysLeft} days left in the vault.</h1>
  <p style="margin:0 0 16px;line-height:1.7;color:#ccc">
    Your full vault access ends in ${daysLeft} days. You've had it longer than most —
    keep the streak going and nothing resets.
  </p>
  <a href="${renewUrl}"
     style="display:inline-block;margin:8px 0 16px;background:#22c55e;color:#0a0a0a;font-weight:700;font-size:14px;
            padding:12px 28px;border-radius:10px;text-decoration:none">
    Renew for $7 — save $2 →
  </a>
  <p style="margin:0;font-size:13px;color:#888;line-height:1.6">
    Renewing keeps your days-kept counter alive. If it lapses, you re-pay the full $9 to come back.
  </p>`;
}

/** Expired paid members — the 7-day reopen window at member price. */
export function winbackEmailHtml(renewUrl: string): string {
  return `
  <h1 style="margin:0 0 12px;font-size:22px;color:#fff">Your vault access expired.</h1>
  <p style="margin:0 0 16px;line-height:1.7;color:#ccc">
    Everything you unlocked — the gated posts, the routines, the reference material —
    is locked again. One click reopens it, and as a returning member you pay the
    <b style="color:#fff">renewal price, not the full price</b>.
  </p>
  <a href="${renewUrl}"
     style="display:inline-block;margin:8px 0 16px;background:#22c55e;color:#0a0a0a;font-weight:700;font-size:14px;
            padding:12px 28px;border-radius:10px;text-decoration:none">
    Reopen the vault — $7 →
  </a>
  <p style="margin:16px 0 0;font-size:13px;color:#888;line-height:1.6">
    This member price is a one-time reopening offer — after this email it's $9.
  </p>`;
}

/** Owner-authored broadcast (sent from the admin Email tab). */
export function broadcastEmailHtml(
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string
): string {
  const cta = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;margin:8px 0;background:#22c55e;color:#0a0a0a;font-weight:700;
         font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">${ctaLabel}</a>`
    : "";
  return `
  <h1 style="margin:0 0 12px;font-size:22px;color:#fff">${title}</h1>
  <div style="line-height:1.7;color:#ccc">${bodyHtml.replace(/\n/g, "<br>")}</div>
  ${cta}
  <p style="margin:20px 0 0;font-size:12px;color:#777">
    Hit reply if anything's unclear — I read every reply. (If this landed in your
    Promotions tab, dragging it to Primary makes sure you catch the next free drop.)
  </p>`;
}
