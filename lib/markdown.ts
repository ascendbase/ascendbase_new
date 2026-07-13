// Tiny, dependency-free Markdown -> safe HTML renderer for vault post text.
// Supports: headings (#..######), bold **x**, italic *x* / _x_, inline code `x`,
// links [t](url), unordered lists (- / *), ordered lists (1.), blockquotes (>),
// horizontal rules (---), and paragraphs / line breaks. Everything is HTML-escaped
// first, so user content can never inject markup (XSS-safe).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  let s = escapeHtml(text);
  // inline code
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code class="md-code">${c}</code>`);
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // italic
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  // links [text](url) — only http(s) / mailto allowed
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, t, u) =>
      `<a href="${u}" target="_blank" rel="noopener noreferrer" class="md-link">${t}</a>`
  );
  return s;
}

export function renderMarkdown(src: string): string {
  const lines = (src || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      closeList();
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level} class="md-h md-h${level}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // blockquote (collect consecutive)
    if (/^\s*>\s?/.test(line)) {
      closeList();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(inline(lines[i].replace(/^\s*>\s?/, "")));
        i++;
      }
      out.push(`<blockquote class="md-quote">${quote.join("<br/>")}</blockquote>`);
      continue;
    }

    // unordered list
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push('<ul class="md-ul">');
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    // ordered list
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push('<ol class="md-ol">');
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    // paragraph (collect consecutive non-empty, non-special lines)
    closeList();
    const para: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      para.push(inline(lines[i]));
      i++;
    }
    out.push(`<p class="md-p">${para.join("<br/>")}</p>`);
  }
  closeList();
  return out.join("\n");
}