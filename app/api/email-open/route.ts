import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { initDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 1x1 open-tracking pixel. Marks the email_log row as opened (once).
 * Returns a transparent GIF so email clients render it silently.
 * Note: counts are approximate — text-only clients and image blockers
 * won't fire it, so treat opens as a floor, not an exact count.
 */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  if (t && /^\d+$/.test(t)) {
    try {
      await initDb();
      await db.execute({
        sql: "UPDATE email_log SET opened = 1 WHERE id = ? AND opened = 0",
        args: [Number(t)],
      });
    } catch {
      // never break image rendering
    }
  }
  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new Response(new Uint8Array(gif), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
