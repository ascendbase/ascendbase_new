// Pure plan definitions — NO database import, safe to use in client components.
export type Plan = {
  key: string;
  name: string;
  price: number;
  days: number;
  description: string;
  features: string[];
  cta: string;
};

/** The implicit free tier (sign-up). Not a paid plan. */
export const FREE_PLAN = {
  key: "free",
  name: "Free Access",
  cta: "Continue for free",
};

/**
 * Three paid tiers. The "free" tier (sign-up) is implicit and not listed here.
 * Prices are USDT. `days` controls how long access lasts after verification.
 */
export const PLANS: Plan[] = [
  {
    key: "vault",
    name: "Full Vault Access",
    price: 19,
    days: 30,
    description:
      "Open the entire gated vault — every lesson, routine and reference post, on demand.",
    features: [
      "Full access to all vault content (free + members-only posts)",
      "Browse the complete knowledge base any time",
      "30 days of access, re-pay to extend",
    ],
    cta: "Unlock full vault access",
  },
  {
    key: "advice",
    name: "Personal Looksmaxing Advice",
    price: 49,
    days: 30,
    description:
      "Get in contact with me directly and send your face. You receive a complete, personal breakdown of your looks:",
    features: [
      "Full list of your individual facial flaws",
      "Full package of your facial ratios and your harmony score",
      "Full explanation of your facial status, with a Q&A option until you 100% understand the meaning behind every detail",
      "Full access to the gated vault for 30 days as a bonus",
    ],
    cta: "Unlock personal plan",
  },
  {
    key: "coaching",
    name: "Personal Monthly Coaching",
    price: 99,
    days: 30,
    description:
      "A full month of hands-on coaching with actual, practical looksmaxing steps tailored to you — not just theory.",
    features: [
      // Everything in the 19 & 49 tiers, plus:
      "Full access to all vault content (free + members-only posts)",
      "Full list of your individual facial flaws",
      "Full package of your facial ratios and your harmony score",
      "Full explanation of your facial status, with Q&A until you 100% understand",
      "Personal monthly coaching program",
      "Real, practical looksmaxing steps to follow",
      "Direct contact and ongoing guidance",
      "Full access to the gated vault while coaching is active",
    ],
    cta: "Unlock personal coaching",
  },
];

export function getPlan(key?: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}