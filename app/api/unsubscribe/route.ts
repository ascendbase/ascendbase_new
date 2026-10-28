import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initDb } from "@/lib/db";
import { isOptedOut, unsubscribeToken } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-click unsubscribe from broadcasts. Link format: /api/unsubscribe?token=<base64url email> */
export async function GET(req: NextRequest) {
  await initDb();
  const token = req.nextUrl.searchParams.get("token") || "";
  let email = "";
  try {
    email = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    email = "";
  }
  if (!email || !email.includes("@")) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }
  if (!(await isOptedOut(email))) {
    await db.execute({
      sql: "INSERT INTO email_optouts (email) VALUES (?)",
      args: [email],
    });
  }
  return new NextResponse(
    `<!doctype html><html><body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui;display:grid;place-items:center;min-height:100vh">
     <div style="text-align:center;padding:24px">
       <h1 style="font-size:20px;margin:0 0 8px">You're unsubscribed.</h1>
       <p style="margin:0;color:#888">You won't receive any more broadcast emails from Ascendbase.</p>
     </div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
