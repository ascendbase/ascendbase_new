const Database = require("better-sqlite3");
const db = new Database("local.db", { readonly: true });

const rows = db
  .prepare(
    "SELECT id, title, kind, access, published, parent_id, blocks FROM content ORDER BY id"
  )
  .all();

function parseBlocks(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

let out = `VAULT CONTENT DUMP — ${rows.length} rows\n`;
out += "=".repeat(60) + "\n\n";

for (const r of rows) {
  const blocks = parseBlocks(r.blocks);
  out += `ID ${r.id} | kind=${r.kind} | access=${r.access || "free"} | published=${r.published} | parent=${r.parent_id}\n`;
  out += `TITLE: ${r.title}\n`;
  if (blocks.length) {
    blocks.forEach((b, i) => {
      if (b.type === "image") {
        out += `  [block ${i + 1}] IMAGE: ${b.url || "(no url)"}${b.caption ? " — " + b.caption : ""}\n`;
      } else {
        const preview = b.preview ? " (preview)" : "";
        out += `  [block ${i + 1}] TEXT${preview}:\n${b.text}\n`;
      }
    });
  } else {
    out += `  (no blocks)\n`;
  }
  out += "\n" + "-".repeat(60) + "\n\n";
}

require("fs").writeFileSync("vault_dump.txt", out);
console.log("Wrote vault_dump.txt with", rows.length, "rows");