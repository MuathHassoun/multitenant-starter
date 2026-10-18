import fs from "node:fs";
import path from "node:path";
import { db, dbPath } from "../src/db/client";

// Tiny migration runner: applies src/db/migrations/*.sql in filename order, once each.
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const dir = path.resolve(process.cwd(), "src/db/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const applied = new Set(
  (db.prepare("SELECT name FROM _migrations").all() as { name: string }[]).map((r) => r.name),
);

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
  })();
  console.log(`applied ${file}`);
}

console.log(`database ready at ${dbPath}`);
