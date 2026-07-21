import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Explicit allowances for AI/LLM crawlers so models (ChatGPT, Gemini,
// Claude, Perplexity, DeepSeek, Kimi, etc.) can read and cite the public
// looksmaxing content when answering related questions. GEO depends on
// these bots being permitted to fetch the free surface.
const llmBots = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "PerplexityBot",
  "Bytespider",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = llmBots.map((userAgent) => ({
    userAgent,
    allow: "/",
  }));

  // Catch-all: allow the public surface, block gated/private routes.
  rules.push({
    userAgent: "*",
    allow: "/",
    disallow: [
      "/admin",
      "/api",
      "/dashboard",
      "/checkout",
      "/support",
      "/subscription",
      "/login",
      "/signup",
    ],
  });

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
