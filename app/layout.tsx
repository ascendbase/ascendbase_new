import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  DEFAULT_OG_IMAGE,
  SOCIAL,
  SAME_AS,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "System-level knowledge on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing). Use the free facial ratio calculator, read the free vault, and unlock the full members-only deep-dives with crypto.",
  keywords: [
    "looksmaxing",
    "facial attractiveness",
    "craniofacial development",
    "facial ratio calculator",
    "golden ratio face",
    "facial harmony",
    "hunter eyes",
    "forward growth",
    "male facial aesthetics",
    "face morph",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Male facial attractiveness, decoded. Free facial ratio calculator, free vault posts, and members-only craniofacial deep-dives.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Male facial attractiveness, decoded. Free facial ratio calculator + free looksmaxing vault.",
    images: [DEFAULT_OG_IMAGE],
    creator: "@feralmaxing",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ascendbase",
  },
  other: {
    "og:image:width": "1200",
    "og:image:height": "630",
    // Discovery hint for LLM crawlers / GEO tooling. Non-standard, but
    // increasingly read by AI assistants looking for /llms.txt.
    llmstxt: "/llms.txt",
  },
};

// Organization structured data — connects the site to its social profiles
// (authority / E-E-A-T signal for search and assistant engines).
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation.",
  slogan: SITE_TAGLINE,
  sameAs: SAME_AS,
  founder: {
    "@type": "Person",
    name: "feralmaxing",
    url: SOCIAL.instagram,
  },
};

// WebSite + SearchAction — eligible for the Google sitelinks search box
// rich result, which boosts branded search real estate.
const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_TAGLINE,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/learn?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
