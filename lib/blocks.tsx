import React from "react";

// Minimal, dependency-free Markdown renderer for ascendbase content blocks.
// Blocks are stored as { type: "text", text, preview? } where `text` is a
// single MarkDown unit: a "## " heading, a "- " bullet list, or a paragraph
// (which may contain **bold** and inline `- ` lists).
//
// This keeps the public /learn posts fully server-rendered and indexable
// without pulling in a heavy markdown library.

type Block = { type?: string; text: string; preview?: boolean };

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Split on **bold** and render as <strong>.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyBase}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyBase}-t${i}`}>{part}</React.Fragment>;
  });
}

function renderParagraph(text: string, key: string): React.ReactNode {
  // Bullet list inside a paragraph: lines starting with "- ".
  const lines = text.split("\n").map((l) => l.trim());
  const bulletStart = lines.findIndex((l) => l.startsWith("- "));
  if (bulletStart >= 0) {
    const intro = lines.slice(0, bulletStart).join(" ").trim();
    const items = lines.slice(bulletStart).filter((l) => l.startsWith("- "));
    return (
      <div key={key} className="space-y-2">
        {intro && <p className="text-white/70 leading-relaxed">{renderInline(intro, key + "-i")}</p>}
        <ul className="list-disc pl-5 space-y-1 text-white/70 leading-relaxed">
          {items.map((it, i) => (
            <li key={`${key}-li${i}`}>{renderInline(it.replace(/^-\s+/, ""), `${key}-li${i}`)}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <p key={key} className="text-white/70 leading-relaxed">
      {renderInline(text, key)}
    </p>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        const key = `blk-${i}`;
        const text = (b.text || "").trim();
        if (!text) return null;
        if (text.startsWith("## ")) {
          return (
            <h2 key={key} className="mt-8 text-2xl font-bold tracking-tight text-white">
              {renderInline(text.slice(3), key)}
            </h2>
          );
        }
        if (text.startsWith("### ")) {
          return (
            <h3 key={key} className="mt-6 text-xl font-semibold text-white/90">
              {renderInline(text.slice(4), key)}
            </h3>
          );
        }
        return renderParagraph(text, key);
      })}
    </div>
  );
}
