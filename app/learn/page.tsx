import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, Badge } from "@/components/ui";
import { db, initDb } from "@/lib/db";
import { absUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Free Looksmaxing Vault — craniofacial development & facial science",
  description:
    "Read the free ascendbase vault: system-level, no-fluff articles on male facial attractiveness, craniofacial development, forward growth, and facial evaluation. Start free — upgrade for the members-only deep-dives.",
  keywords: [
    "looksmaxing guide",
    "craniofacial development",
    "forward growth face",
    "facial attractiveness science",
    "free looksmaxing articles",
    "hunter eyes",
    "masculine facial features",
  ],
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: absUrl("/learn"),
    siteName: "ascendbase",
    title: "Free Looksmaxing Vault — ascendbase",
    description:
      "System-level articles on male facial attractiveness and craniofacial development.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "ascendbase vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Looksmaxing Vault — ascendbase",
    description: "System-level articles on male facial attractiveness and craniofacial development.",
    images: [DEFAULT_OG_IMAGE],
  },
};

async function getFreePosts() {
  await initDb();
  const rows = await db.execute({
    sql: `SELECT id, slug, title, updated_at FROM content
          WHERE kind = 'post' AND published = 1 AND access = 'free' AND slug IS NOT NULL
          ORDER BY order_index ASC, id ASC`,
    args: [],
  });
  return rows.rows.map((r) => {
    const row = r as unknown as { id: number; slug: string; title: string; updated_at: string };
    return row;
  });
}

export default async function LearnIndex() {
  let posts: { id: number; slug: string; title: string; updated_at: string }[] = [];
  try {
    posts = await getFreePosts();
  } catch {
    // DB unreachable at build — render empty state.
  }

  return (
    <>
      <SiteNav />
      <main>
        <section className="border-b border-white/10">
          <Container className="py-12 text-center">
            <Badge tone="green">Free vault</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Looksmaxing, decoded
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Free, system-level articles on how the face actually develops and what drives
              attractiveness. No TikTok buzzwords — real craniofacial mechanics.
            </p>
          </Container>
        </section>

        <Container className="py-12">
          {posts.length === 0 ? (
            <p className="text-center text-white/50">
              No free articles published yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/learn/${p.slug}`} className="group block">
                  <GlassCard className="h-full transition-transform hover:-translate-y-1">
                    <h2 className="text-lg font-bold text-white/90 group-hover:text-red-glow">
                      {p.title}
                    </h2>
                    <p className="mt-2 text-xs text-white/40">Free read · no sign-up</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-white/50">
              Want the full deep-dives, personal evaluation, and face morphs?{" "}
              <Link href="/#vault" className="text-red-glow hover:underline">
                Unlock the members vault
              </Link>{" "}
              or try the{" "}
              <Link href="/ratios" className="text-red-glow hover:underline">
                free facial ratio calculator
              </Link>
              .
            </p>
          </div>
        </Container>
      </main>
    </>
  );
}
