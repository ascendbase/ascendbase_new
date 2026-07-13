import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

// Members AND admins can upload images here to attach to support messages.
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  try {
    const saved = await saveImage(file);
    return NextResponse.json({ url: saved.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed." }, { status: 400 });
  }
}