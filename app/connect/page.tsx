import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard } from "@/components/ui";
import type { Metadata } from "next";
import { SITE_URL, absUrl, DEFAULT_OG_IMAGE, SOCIAL, SAME_AS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Connect — ascendbase on Instagram, YouTube & Discord",
  description:
    "Follow ascendbase for looksmaxing breakdowns, craniofacial development science, and community progress. Instagram, YouTube, and Discord.",
  keywords: [
    "looksmaxing instagram",
    "craniofacial youtube",
    "looksmaxing discord",
    "feralmaxing",
    "ascendbase community",
  ],
  alternates: { canonical: "/connect" },
  openGraph: {
    type: "website",
    url: absUrl("/connect"),
    siteName: "ascendbase",
    title: "Connect — ascendbase on Instagram, YouTube & Discord",
    description: "Follow ascendbase for looksmaxing breakdowns and craniofacial science.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "ascendbase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connect — ascendbase",
    description: "Follow ascendbase for looksmaxing breakdowns and craniofacial science.",
    images: [DEFAULT_OG_IMAGE],
  },
};

const LINKS = [
  {
    label: "Community Discord",
    desc: "Join the community, ask questions, share progress.",
    href: "https://discord.gg/M366vrDf9V",
    handle: "discord.gg/M366vrDf9V",
  },
  {
    label: "YouTube",
    desc: "Video breakdowns on craniofacial development and looksmaxing.",
    href: "https://www.youtube.com/@ascendbase-y4u",
    handle: "youtube.com/@ascendbase-y4u",
  },
  {
    label: "Instagram",
    desc: "Author's personal page — updates and behind the scenes.",
    href: "https://www.instagram.com/feralmaxing/",
    handle: "instagram.com/feralmaxing",
  },
];

export default function ConnectPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "feralmaxing",
            url: SOCIAL.instagram,
            sameAs: SAME_AS,
          }),
        }}
      />
      <SiteNav />
      <Container className="py-12">
        <h1 className="text-3xl font-black tracking-tight">Connect</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Find ascendbase across the web. Join the community, watch the
          breakdowns, and follow the author.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="me noreferrer"
              className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-red/40 hover:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-white/90 group-hover:text-red-glow">
                  {l.label}
                </span>
                <span className="text-white/30 transition group-hover:text-red-glow">
                  ↗
                </span>
              </div>
              <p className="mt-1 text-sm text-white/50">{l.desc}</p>
              <p className="mt-3 text-[11px] font-mono text-white/35">
                {l.handle}
              </p>
            </a>
          ))}
        </div>

        <GlassCard className="mt-6 text-center text-sm text-white/45">
          Questions about your account or the vault? Head to{" "}
          <Link href="/support" className="text-red-glow hover:underline">
            Support
          </Link>
          .
        </GlassCard>
      </Container>
    </>
  );
}