import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcryptjs";

const url = process.env.TURSO_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db: Client = createClient(
  authToken ? { url, authToken } : { url }
);

let initialized = false;

export async function initDb() {
  if (initialized) return;
  initialized = true;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      plan TEXT NOT NULL DEFAULT '30d',
      amount REAL,
      coin TEXT,
      network TEXT,
      tx_hash TEXT,
      order_id TEXT UNIQUE,
      plan_key TEXT,
      expires_at TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      body TEXT,
      image_data TEXT,
      blocks TEXT,
      kind TEXT NOT NULL DEFAULT 'post',
      parent_id INTEGER,
      order_index INTEGER NOT NULL DEFAULT 0,
      access TEXT NOT NULL DEFAULT 'free',
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS support_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await migrateColumn("support_messages", "image_url", "TEXT");

  // Migrations for databases created before these columns existed.
  await migrateColumn("subscriptions", "network", "TEXT");
  await migrateColumn("subscriptions", "tx_hash", "TEXT");
  await migrateColumn("subscriptions", "plan_key", "TEXT");
  await migrateColumn("content", "blocks", "TEXT");
  await migrateColumn("content", "kind", "TEXT NOT NULL DEFAULT 'post'");
  await migrateColumn("content", "parent_id", "INTEGER");
  await migrateColumn("content", "order_index", "INTEGER NOT NULL DEFAULT 0");
  await migrateColumn("content", "access", "TEXT NOT NULL DEFAULT 'free'");
  // Allow NULL slugs (folders have no slug). SQLite can't alter NOT NULL
  // in place, so rebuild the table without that constraint.
  await dropSlugNotNull();

  await seedAdmin();
}

async function migrateColumn(table: string, column: string, type: string) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch {
    // column already exists — ignore
  }
}

async function dropSlugNotNull() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS content_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        title TEXT NOT NULL,
        body TEXT,
        image_data TEXT,
        blocks TEXT,
        kind TEXT NOT NULL DEFAULT 'post',
        parent_id INTEGER,
        order_index INTEGER NOT NULL DEFAULT 0,
        access TEXT NOT NULL DEFAULT 'free',
        published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await db.execute(`
      INSERT INTO content_new (id, slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, created_at, updated_at)
      SELECT id, slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, created_at, updated_at FROM content;
    `);
    await db.execute(`DROP TABLE content;`);
    await db.execute(`ALTER TABLE content_new RENAME TO content;`);
  } catch {
    // already migrated or table shape differs — ignore
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) return;
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length) return;
  const hash = bcrypt.hashSync(pw, 10);
  await db.execute({
    sql: "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
    args: [email, hash],
  });
  // eslint-disable-next-line no-console
  console.log(`[ascendbase] seeded admin account: ${email}`);
}
