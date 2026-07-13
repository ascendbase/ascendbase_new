import fs from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

/**
 * Image storage for vault content.
 *
 * - Local dev / VPS with writable disk: images go to public/uploads (served
 *   statically by Next). No config needed.
 * - Production on read-only FS (Vercel): set BLOB_READ_WRITE_TOKEN and images
 *   are stored in Vercel Blob, persisting across deploys.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export type SavedImage = { url: string; key: string };

export async function saveImage(file: File): Promise<SavedImage> {
  if (!file || !file.size) throw new Error("No file provided.");
  if (!file.type.startsWith("image/"))
    throw new Error("Only image files are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image too large (max 8MB).");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const safeExt = ext || "png";
  const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const res = await put(key, buf, {
      access: "public",
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { url: res.url, key };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, key), buf);
  return { url: `/uploads/${key}`, key };
}

/**
 * Permanently delete an image by its URL. Handles both local
 * (public/uploads/...) and Vercel Blob (https://...vercel-storage.com/...)
 * storage. Safe to call with any URL — unknown formats are ignored.
 */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
      return; // remote URL we can't delete without a token — skip silently
    }
    if (url.startsWith("/uploads/")) {
      const fp = path.join(process.cwd(), "public", url);
      await fs.rm(fp, { force: true });
    }
  } catch {
    /* best-effort: ignore missing files / token errors */
  }
}
