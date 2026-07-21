// Central SEO configuration for ascendbase.
// Single source of truth for the canonical domain, brand, and social handles.
// Override the domain in production via NEXT_PUBLIC_SITE_URL (e.g. https://ascendbase.app).

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.ascendbase.pro";

export const SITE_NAME = "ascendbase";

export const SITE_TAGLINE = "Male facial attractiveness, decoded";

// Default Open Graph / Twitter image (absolute URL required by social crawlers).
// Uses the file-based opengraph-image route (served at /opengraph-image).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

export const SOCIAL = {
  instagram: "https://www.instagram.com/feralmaxing/",
  youtube: "https://www.youtube.com/@ascendbase-y4u",
  discord: "https://discord.gg/M366vrDf9V",
  tiktok: "", // add when available
};

// Brand / organization structured-data sameAs links (authority signals).
export const SAME_AS = [
  SOCIAL.instagram,
  SOCIAL.youtube,
  SOCIAL.discord,
].filter(Boolean);

export type SeoMeta = {
  title: string;
  description: string;
  path: string; // path-only, e.g. "/ratios"
  ogImage?: string;
  type?: "website" | "article" | "software";
};

// Build absolute URL from a path.
export function absUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
