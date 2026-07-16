"use client";

import Link from "next/link";

const LINKS = [
  {
    label: "Community Discord",
    href: "https://discord.gg/M366vrDf9V",
    handle: "discord.gg/ascendbase",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ascendbase-y4u",
    handle: "youtube.com/@ascendbase",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/feralmaxing/",
    handle: "instagram.com/feralmaxing",
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link
            href="/"
            className="text-[15px] font-bold tracking-tight"
          >
            ascend<span className="text-red-glow">base</span>
          </Link>

          <p className="max-w-md text-sm text-white/45">
            System-level knowledge on male facial attractiveness,
            craniofacial development, and personal facial evaluation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-0.5 text-white/55 transition-colors hover:text-white"
              >
                <span className="text-[13px] font-semibold">{l.label}</span>
                <span className="text-[11px] text-white/35 group-hover:text-red-glow">
                  {l.handle}
                </span>
              </a>
            ))}
          </div>

          <p className="text-[11px] text-white/30">
            © {new Date().getFullYear()} ascendbase. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}