// Live vault cleanup + preview-gating fix (writes back to Turso).
// Backs up to a timestamped file first, then applies fixes.
const fs = require("fs");
const path = require("path");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const { createClient } = require("@libsql/client");
const db = createClient(env.TURSO_AUTH_TOKEN ? { url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN } : { url: env.TURSO_URL });

// Confident typo fixes only.
const FIXES = [
  [/direclty/gi, "directly"],
  [/separtes/gi, "separates"],
  [/percieved/gi, "perceived"],
  [/natrually/gi, "naturally"],
  [/appreance/gi, "appearance"],
  [/relativelyto/gi, "relatively to"],
  [/retuded/gi, "retruded"],
  [/reffered/gi, "referred"],
  [/bulbulous/gi, "bulbous"],
  [/bonemass/gi, "bone mass"],
  [/bonesmass/gi, "bone mass"],
  [/bpilled/gi, "blackpilled"],
  [/euryprosopic/gi, "euryprosopic"],
  [/craniofacial/gi, "craniofacial"],
  [/imporant/gi, "important"],
  [/\btp\b/gi, "to"],
];
function fixText(s) {
  if (!s) return s;
  for (const [re, rep] of FIXES) s = s.replace(re, rep);
  return s;
}
function parseBlocks(raw) {
  if (!raw) return [];
  try { const a = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(a) ? a : []; }
  catch { return []; }
}

(async () => {
  const res = await db.execute({ sql: `SELECT id, title, blocks, kind, access, parent_id FROM content ORDER BY id`, args: [] });
  const rows = res.rows;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `vault_backup_${stamp}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
  console.log(`Backup written: ${backupFile}`);

  let changed = 0;
  for (const r of rows) {
    const id = r.id;
    let blocks = parseBlocks(r.blocks);
    const isPreviewPost = (r.access || "free") === "preview" && (r.kind || "post") === "post";
    let dirty = false;

    let newTitle = fixText(r.title);
    if (newTitle !== r.title) dirty = true;
    blocks = blocks.map((b) => {
      if (b && b.type === "text" && typeof b.text === "string") {
        const t = fixText(b.text);
        if (t !== b.text) { dirty = true; return { ...b, text: t }; }
      }
      return b;
    });

    if (isPreviewPost) {
      blocks = blocks.map((b, i) => {
        const want = i < 2;
        if (!!b.preview !== want) { dirty = true; return { ...b, preview: want }; }
        return b;
      });
    } else {
      blocks = blocks.map((b) => {
        if (b && b.preview) { dirty = true; return { ...b, preview: false }; }
        return b;
      });
    }

    let newAccess = r.access;
    if (id === 1 && (r.access || "free") === "preview") { newAccess = "free"; dirty = true; }

    if (dirty) {
      changed++;
      await db.execute({
        sql: `UPDATE content SET title = ?, blocks = ?, access = ? WHERE id = ?`,
        args: [newTitle, JSON.stringify(blocks), newAccess, id],
      });
      console.log(`  fixed ID ${id} (${isPreviewPost ? "preview post" : r.kind})`);
    }
  }
  console.log(`\nDone. ${changed} rows updated.`);
  console.log(`To revert: node scripts/revert_vault.cjs ${backupFile}`);
  await db.close();
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });