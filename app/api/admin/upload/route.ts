import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

// Admin-only image upload for vault content.
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  try {
    const saved = await saveImage(file);
    return NextResponse.json({ ok: true, url: saved.url, key: saved.key });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed." },
      { status: 400 }
    );
  }
}
