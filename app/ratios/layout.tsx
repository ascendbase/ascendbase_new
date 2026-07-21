import type { Metadata } from "next";
import { Container, GlassCard, Badge } from "@/components/ui";
import { SITE_URL, absUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";
import Link from "next/link";

// SoftwareApplication structured data for the calculator (rich-result eligible).
const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ascendbase Facial Ratio Calculator",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  url: absUrl("/ratios"),
  description:
    "Free, browser-based facial ratio calculator: frontal harmony, side-profile proportions, and nose-shape analysis.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "ascendbase", url: SITE_URL },
};

// FAQPage structured data — mirrors the visible FAQ section below so the
// questions are eligible for Google's FAQ rich result.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a facial ratio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A facial ratio compares the distances between key landmarks on the face (eyes, nose, mouth, jaw) to quantify balance and proportion. Ratios close to established aesthetic references — often derived from the golden ratio — are broadly associated with perceived attractiveness.",
      },
    },
    {
      "@type": "Question",
      name: "What is a facial harmony score?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The harmony score combines several measured ratios into a single 0 to 100 index of overall facial balance. It is a heuristic for proportion, not a verdict on worth, and it says nothing about features you can develop or change.",
      },
    },
    {
      "@type": "Question",
      name: "Is this a diagnostic tool?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. This calculator is for educational self-assessment only. For a structured, personal breakdown of your face — including morphs and a development plan — see the members vault.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Free Facial Ratio Calculator — Golden Ratio Face Test",
  description:
    "Upload a photo and get instant, science-based facial ratio measurements: frontal harmony, side-profile proportions, and nose-shape analysis. Runs 100% in your browser — free, no sign-up required.",
  keywords: [
    "facial ratio calculator",
    "golden ratio face test",
    "facial harmony score",
    "face proportions analyzer",
    "symmetry face test",
    "looksmaxing calculator",
  ],
  alternates: { canonical: "/ratios" },
  openGraph: {
    type: "website",
    url: absUrl("/ratios"),
    siteName: "ascendbase",
    title: "Free Facial Ratio Calculator — Golden Ratio Face Test | ascendbase",
    description:
      "Upload a photo for instant, science-based facial ratio analysis (frontal, profile, nose). Free, private, no sign-up.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "ascendbase facial ratio calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Facial Ratio Calculator — Golden Ratio Face Test",
    description: "Instant, science-based facial ratio analysis. Free, private, runs in your browser.",
    images: [DEFAULT_OG_IMAGE],
  },
};

// Static, server-rendered explanatory content wrapped around the client
// calculator. This copy is what search engines index for "facial ratio"
// queries — the calculator itself is interactive client JS.
export default function RatiosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main>
        {/* Server-rendered SEO header (indexable) */}
        <section className="border-b border-white/10">
          <Container className="py-10 text-center">
            <Badge tone="green">Free tool · No sign-up</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Facial Ratio Calculator
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Measure your facial proportions against established aesthetic reference
              ratios. Upload a photo and get instant, science-based readings — frontal
              harmony, side-profile proportions, and a dedicated nose-shape analysis.
              Everything runs 100% in your browser, so your image never leaves your device.
            </p>
          </Container>
        </section>

        {children}

        {/* Server-rendered explanatory FAQ / learn section (indexable long-tail) */}
        <section className="py-16">
          <Container className="max-w-3xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              What your facial ratios mean
            </h2>
            <div className="mt-8 space-y-4">
              <GlassCard>
                <h3 className="text-lg font-bold">What is a facial ratio?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  A facial ratio compares the distances between key landmarks on the face
                  (eyes, nose, mouth, jaw) to quantify balance and proportion. Ratios close
                  to established aesthetic references — often derived from the golden ratio —
                  are broadly associated with perceived attractiveness.
                </p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-lg font-bold">What is a facial harmony score?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  The harmony score combines several measured ratios into a single 0–100
                  index of overall facial balance. It is a heuristic for proportion, not a
                  verdict on worth — and it says nothing about features you can develop or change.
                </p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-lg font-bold">Is this a diagnostic tool?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  No. This calculator is for educational self-assessment only. For a
                  structured, personal breakdown of your face — including morphs and a
                  development plan — see the{" "}
                  <Link href="/#vault" className="text-red-glow hover:underline">
                    members vault
                  </Link>
                  .
                </p>
              </GlassCard>
            </div>
            <p className="mt-8 text-center text-sm text-white/40">
              Want the theory behind why these ratios matter? Read the{" "}
              <Link href="/learn" className="text-red-glow hover:underline">
                free looksmaxing vault
              </Link>
              .
            </p>
          </Container>
        </section>
      </main>
    </>
  );
}
