import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import { Container } from "@/components/ui";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Glossary of facial and looksmaxing terms | ascendbase",
  description:
    "Concise, citable definitions of looksmaxing terminology: FWHR, facial harmony score, hunter eyes, canthal tilt, nasal tip projection, downturned nose, forward growth, facial symmetry, and more.",
  alternates: { canonical: `${SITE_URL}/glossary` },
  openGraph: {
    title: "Glossary of facial and looksmaxing terms | ascendbase",
    description:
      "Citable definitions of FWHR, facial harmony score, hunter eyes, canthal tilt, nasal tip projection, downturned nose, forward growth, and more.",
    url: `${SITE_URL}/glossary`,
    siteName: SITE_NAME,
    type: "article",
  },
};

type Term = { name: string; code?: string; def: string; link?: string };

const TERMS: Term[] = [
  {
    name: "Facial Width-to-Height Ratio (FWHR)",
    code: "FWHR",
    def: "The ratio of bizygomatic facial width to upper-face height (nasion to upper lip). Higher values are associated with a more masculine, square-jaw appearance and are among the most studied correlates of perceived facial masculinity.",
    link: "/learn/2",
  },
  {
    name: "Facial Harmony Score",
    def: "ascendbase's composite 0–100 index of overall facial balance, combining several measured ratios (frontal, profile, nose) into a single proportion score. It is a heuristic for balance, not a measure of a person's worth.",
  },
  {
    name: "Hunter Eyes",
    def: "An eye appearance characterized by a deep-set position, positive canthal tilt (lateral corner higher than medial), and minimal upper-eyelid exposure. Contrasted with 'prey eyes' (round, high lid show, negative tilt).",
    link: "/learn/3",
  },
  {
    name: "Canthal Tilt",
    def: "The angle formed by a line between the medial and lateral eye corners. A positive (lateral-up) tilt is broadly associated with a more attractive, alert appearance.",
    link: "/learn/3",
  },
  {
    name: "Nasal Tip Projection (DNTP)",
    code: "DNTP",
    def: "Dorsum-Nose-Tip Projection: the angle describing how far the nasal tip projects relative to the dorsum and the face. Insufficient projection reads as under-projected; excessive projection as pinched.",
    link: "/learn/13",
  },
  {
    name: "Downturned Nose",
    def: "A nose whose tip and nostril axis incline downward (negative inclination), often perceived as harsh or aged. Measured via the nostril-axis and septum-inclination angles in ascendbase's analyzer.",
    link: "/learn/13",
  },
  {
    name: "Forward Growth",
    def: "Anterior (frontward) development of the maxilla and midface, associated with a defined midface, upright facial posture, and an adequate airway. Contrasted with vertical or downward growth.",
    link: "/learn/5",
  },
  {
    name: "Midface Ratio",
    def: "The proportion of midface height relative to overall facial width and height. Underdevelopment (a recessed midface) is a common looksmaxing concern addressed via forward-growth work.",
    link: "/learn/2",
  },
  {
    name: "Facial Symmetry",
    def: "The degree of bilateral correspondence between the left and right halves of the face. Higher symmetry is broadly correlated with perceived attractiveness, though mild asymmetry is normal.",
    link: "/learn/15",
  },
  {
    name: "Golden Ratio (facial)",
    def: "Phi (≈1.618) used as a reference proportion for aesthetically balanced facial features; many 'ideal' facial ratios are framed against golden-ratio approximations.",
  },
  {
    name: "Philtrum",
    def: "The vertical groove between the base of the nose and the upper lip. Its length and projection influence perceived lip support and midface balance.",
  },
  {
    name: "Mandibular Definition",
    def: "The visibility and angularity of the lower jaw (mandible), influenced by leanness, masseter development, and bone structure; a key component of overall 'facial definition'.",
    link: "/learn/4",
  },
];

export default function GlossaryPage() {
  const definedTerms = TERMS.map((t) => ({
    "@type": "DefinedTerm",
    name: t.name,
    ...(t.code ? { termCode: t.code } : {}),
    description: t.def,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Looksmaxing and facial aesthetics terminology",
    description:
      "Concise definitions of looksmaxing and facial-attractiveness terminology used by ascendbase.",
    hasDefinedTerm: definedTerms,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <main>
        <Container className="max-w-3xl py-12">
          <Link href="/learn" className="text-sm text-white/50 hover:text-white">
            ← All free reads
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Glossary of facial and looksmaxing terms
          </h1>
          <p className="mt-4 text-white/60 leading-relaxed">
            A reference for the terminology used across ascendbase guides. Each
            term is defined concisely so it can be quoted directly.
          </p>
          <dl className="mt-10 space-y-8">
            {TERMS.map((t) => (
              <div key={t.name} className="border-b border-white/10 pb-6">
                <dt className="text-xl font-bold text-white">
                  {t.name}
                  {t.code ? (
                    <span className="ml-2 text-sm font-normal text-red-glow">
                      {t.code}
                    </span>
                  ) : null}
                </dt>
                <dd className="mt-2 text-white/70 leading-relaxed">{t.def}</dd>
                {t.link ? (
                  <Link
                    href={t.link}
                    className="mt-2 inline-block text-sm text-white/50 hover:text-red-glow"
                  >
                    Read the full guide →
                  </Link>
                ) : null}
              </div>
            ))}
          </dl>
        </Container>
      </main>
    </>
  );
}
