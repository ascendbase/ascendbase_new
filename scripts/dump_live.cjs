// Read .env.local manually (no dotenv dep), then dump live Turso vault content.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const envRaw = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.TURSO_URL;
const token = env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("TURSO_URL not found in .env.local");
  process.exit(1);
}

const { createClient } = require("@libsql/client");
const db = createClient(token ? { url, authToken: token } : { url });

function parseBlocks(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

(async () => {
  const res = await db.execute({
    sql: `SELECT id, slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, updated_at
           FROM content ORDER BY id`,
    args: [],
  });
  const rows = res.rows;
  let out = `LIVE VAULT DUMP (Turso) — ${rows.length} rows\n`;
  out += "=".repeat(70) + "\n\n";
  for (const r of rows) {
    const blocks = parseBlocks(r.blocks);
    out += `ID ${r.id} | kind=${r.kind || "post"} | access=${r.access || "free"} | published=${r.published} | parent=${r.parent_id} | slug=${r.slug || ""}\n`;
    out += `TITLE: ${r.title}\n`;
    if (blocks.length) {
      blocks.forEach((b, i) => {
        if (b.type === "image") {
          out += `  [${i + 1}] IMAGE: ${b.url || "(none)"}${b.caption ? " — " + b.caption : ""}\n`;
        } else {
          out += `  [${i + 1}] TEXT${b.preview ? " (preview)" : ""}:\n${b.text}\n`;
        }
      });
    } else if (r.body) {
      out += `  BODY: ${r.body}\n`;
    } else {
      out += `  (no blocks)\n`;
    }
    out += "\n" + "-".repeat(70) + "\n\n";
  }
  fs.writeFileSync("vault_dump.txt", out);
  console.log("Wrote vault_dump.txt —", rows.length, "rows");
  await db.close();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});