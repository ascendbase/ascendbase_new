import type { MetadataRoute } from "next";
import { db, initDb } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/ratios`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/learn`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/connect`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/glossary`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Public, indexable free + preview vault posts. Paid posts stay gated.
  let posts: MetadataRoute.Sitemap = [];
  try {
    await initDb();
    const r = await db.execute({
      sql: `SELECT slug, updated_at FROM content
            WHERE kind = 'post' AND published = 1
              AND access IN ('free','preview') AND slug IS NOT NULL`,
      args: [],
    });
    posts = (r.rows as unknown as { slug: string; updated_at: string }[]).map(
      (row) => ({
        url: `${SITE_URL}/learn/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })
    );
  } catch {
    // DB unavailable at build (e.g. Turso not reachable) — skip posts,
    // static routes still ship so the sitemap is never empty.
  }

  return [...staticRoutes, ...posts];
}
