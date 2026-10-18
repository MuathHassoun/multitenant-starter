import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/app.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Reuse one connection across hot reloads in dev.
const g = globalThis as unknown as { __db?: Database.Database };

function open() {
  const conn = new Database(dbPath);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  return conn;
}

export const db = g.__db ?? open();
if (process.env.NODE_ENV !== "production") g.__db = db;

export { dbPath };
