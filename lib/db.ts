import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const resolveDbPath = () => {
  const configured = process.env.SQLITE_PATH?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "data", "app.db");
};

const ensureDirectory = (filePath: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const initDb = () => {
  const dbPath = resolveDbPath();
  ensureDirectory(dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      api_key TEXT,
      base_url TEXT,
      model TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS captcha_codes (
      token TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      embedding_vector TEXT,
      content_text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  const knowledgeColumns = db.prepare("PRAGMA table_info(knowledge_files)").all() as Array<{ name: string }>;
  const hasContentText = knowledgeColumns.some((column) => column.name === "content_text");
  const hasEmbeddingVector = knowledgeColumns.some((column) => column.name === "embedding_vector");
  if (!hasContentText) {
    db.exec("ALTER TABLE knowledge_files ADD COLUMN content_text TEXT");
  }
  if (!hasEmbeddingVector) {
    db.exec("ALTER TABLE knowledge_files ADD COLUMN embedding_vector TEXT");
  }
  return db;
};

const globalForDb = globalThis as unknown as { sqliteDb?: Database };

export const db = globalForDb.sqliteDb ?? initDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqliteDb = db;
}
