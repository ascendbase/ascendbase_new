import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, Badge, PrimaryButton } from "@/components/ui";
import { db, initDb } from "@/lib/db";
import { absUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import { Blocks } from "@/lib/blocks";
import { answerFirst } from "@/lib/answerFirst";

type PostRow = {
  id: number;
  slug: string | null;
  title: string;
  body: string | null;
  blocks: string | null;
  access: string;
  published: number;
  updated_at: string;
};

async function getPost(slug: string): Promise<PostRow | null> {
  await initDb();
  const r = await db.execute({
    sql: `SELECT id, slug, title, body, blocks, access, published, updated_at
          FROM content WHERE slug = ? AND kind = 'post'`,
    args: [slug],
  });
  if (!r.rows.length) return null;
  return r.rows[0] as unknown as PostRow;
}

// Other public posts (free + preview) for internal cross-linking.
async function getRelatedPosts(currentSlug: string, limit = 3) {
  try {
    await initDb();
    const r = await db.execute({
      sql: `SELECT slug, title FROM content
            WHERE kind='post' AND published=1 AND access IN ('free','preview')
              AND slug IS NOT NULL AND slug != ?
            ORDER BY order_index ASC, id ASC LIMIT ?`,
      args: [currentSlug, limit],
    });
    return (r.rows as unknown as { slug: string; title: string }[]).map((x) => ({
      slug: x.slug,
      title: x.title,
    }));
  } catch {
    return [];
  }
}

// Only published, free or preview posts are publicly indexable.
// Paid posts are never served here (they stay gated).
function isPublic(p: PostRow | null): p is PostRow {
  return !!p && p.published === 1 && (p.access === "free" || p.access === "preview");
}

export async function generateStaticParams() {
  try {
    await initDb();
    const rows = await db.execute({
      sql: `SELECT slug FROM content WHERE kind='post' AND published=1 AND access IN ('free','preview') AND slug IS NOT NULL`,
      args: [],
    });
    return rows.rows.map((r) => ({ slug: (r as unknown as { slug: string }).slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!isPublic(post)) return { title: "Not found" };
  return {
    title: post.title,
    description: `Free looksmaxing read: ${post.title}. System-level breakdown on male facial attractiveness and craniofacial development from ascendbase.`,
    alternates: { canonical: `/learn/${post.slug}` },
    openGraph: {
      type: "article",
      url: absUrl(`/learn/${post.slug}`),
      siteName: SITE_NAME,
      title: `${post.title} | ${SITE_NAME}`,
      description: `Free looksmaxing read on ${post.title}. Craniofacial development and facial evaluation.`,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ${SITE_NAME}`,
      description: `Free looksmaxing read on ${post.title}.`,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function LearnPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!isPublic(post)) notFound();

  // Parse blocks; fall back to plain body if blocks are missing.
  let blocks: { type?: string; text: string; preview?: boolean }[] = [];
  if (post.blocks) {
    try {
      const parsed = JSON.parse(post.blocks);
      if (Array.isArray(parsed)) blocks = parsed;
    } catch {
      /* ignore */
    }
  }
  if (blocks.length === 0 && post.body) {
    blocks = post.body
      .split(/\n{2,}/)
      .map((t) => ({ type: "text", text: t.trim() }))
      .filter((b) => b.text);
  }

  // For preview posts, show only preview-flagged blocks (or first 2 as teaser).
  const shown =
    post.access === "preview"
      ? blocks.filter((b) => b.preview).length
        ? blocks.filter((b) => b.preview)
        : blocks.slice(0, 2)
      : blocks;

  // Answer-first standfirst (overrides the block-based one when a curated
  // answer exists); also used as the Speakable summary.
  const standfirst = answerFirst(post.slug, shown[0]?.text?.trim() ?? "");

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: `Free looksmaxing read on ${post.title}.`,
    author: { "@type": "Person", name: "feralmaxing", url: "https://www.instagram.com/feralmaxing/" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    dateModified: post.updated_at,
    mainEntityOfPage: absUrl(`/learn/${post.slug}`),
    isAccessibleForFree: post.access === "free",
    // Speakable: lets voice assistants (and LLM-driven readers) lift the
    // title + standfirst as the spoken answer.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["[data-speakable-title]", "[data-speakable-summary]"],
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Free vault", item: absUrl("/learn") },
      { "@type": "ListItem", position: 2, name: post.title, item: absUrl(`/learn/${post.slug}`) },
    ],
  };

  const related = await getRelatedPosts(post.slug ?? "");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteNav />
      <main>
        <Container className="max-w-3xl py-12">
          <Link href="/learn" className="text-sm text-white/50 hover:text-white">
            ← All free reads
          </Link>
          <div className="mt-4">
            <Badge tone="green">{post.access === "free" ? "Free read" : "Preview"}</Badge>
            <h1
              data-speakable-title
              className="mt-3 text-4xl font-black tracking-tight sm:text-5xl"
            >
              {post.title}
            </h1>
          </div>

          {standfirst && (
            <p
              data-speakable-summary
              className="mt-4 text-lg leading-relaxed text-white/70"
            >
              {standfirst}
            </p>
          )}
          <article className="mt-6">
            <Blocks blocks={shown.length > 1 ? shown.slice(1) : []} />
          </article>

          {post.access === "preview" && (
            <GlassCard className="mt-10 border-red/30 text-center">
              <h2 className="text-xl font-bold">This is a preview</h2>
              <p className="mt-2 text-white/60">
                The full deep-dive is in the members vault. Unlock it — plus every other
                lesson, routine, and personal evaluation — with crypto.
              </p>
              <div className="mt-5 flex justify-center">
                <Link href="/#vault">
                  <PrimaryButton className="px-8 py-3 text-base">Unlock the vault →</PrimaryButton>
                </Link>
              </div>
            </GlassCard>
          )}

          {/* Internal linking: drive readers to the free calculator + vault */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <Link href="/ratios" className="group block">
              <GlassCard className="h-full transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-bold text-white/90 group-hover:text-red-glow">
                  Try the free facial ratio calculator →
                </h3>
                <p className="mt-1 text-sm text-white/55">
                  Upload a photo, get instant frontal, profile, and nose analysis.
                </p>
              </GlassCard>
            </Link>
            <Link href="/#vault" className="group block">
              <GlassCard className="h-full transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-bold text-white/90 group-hover:text-red-glow">
                  Unlock the members vault →
                </h3>
                <p className="mt-1 text-sm text-white/55">
                  Full deep-dives, personal evaluation, and face morphs.
                </p>
              </GlassCard>
            </Link>
          </div>

          {/* Related reads — cross-link other public posts to keep readers
              in the free funnel and distribute internal link equity. */}
          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold">Related reads</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.slug} href={`/learn/${r.slug}`} className="group block">
                    <GlassCard className="h-full transition-transform hover:-translate-y-1">
                      <h3 className="text-base font-semibold text-white/90 group-hover:text-red-glow">
                        {r.title}
                      </h3>
                      <p className="mt-1 text-xs text-white/40">Free read · no sign-up</p>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/glossary"
              className="text-sm text-white/55 hover:text-red-glow"
            >
              Glossary of facial and looksmaxing terms →
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
