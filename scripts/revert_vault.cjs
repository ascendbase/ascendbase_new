// Revert the live vault from a backup JSON file.
// Usage: node scripts/revert_vault.cjs vault_backup_YYYY-MM-DD...json
const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/revert_vault.cjs <backup.json>"); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const { createClient } = require("@libsql/client");
const db = createClient(env.TURSO_AUTH_TOKEN ? { url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN } : { url: env.TURSO_URL });

(async () => {
  for (const r of rows) {
    await db.execute({
      sql: `UPDATE content SET title = ?, blocks = ?, kind = ?, access = ?, parent_id = ? WHERE id = ?`,
      args: [r.title, typeof r.blocks === "string" ? r.blocks : JSON.stringify(r.blocks), r.kind, r.access, r.parent_id ?? null, r.id],
    });
    console.log(`  reverted ID ${r.id}`);
  }
  console.log(`\nReverted ${rows.length} rows from ${file}`);
  await db.close();
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });