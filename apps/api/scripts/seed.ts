import bcrypt from "bcryptjs";
import { db } from "../src/db/client";

// Two tenants with one owner each, plus a shared user who belongs to both.
const hash = bcrypt.hashSync("password123", 10);

const insertTenant = db.prepare("INSERT OR IGNORE INTO tenants (name, slug) VALUES (?, ?)");
const insertUser = db.prepare("INSERT OR IGNORE INTO users (email, name, password_hash) VALUES (?, ?, ?)");
const insertMember = db.prepare(
  "INSERT OR IGNORE INTO memberships (tenant_id, user_id, role) VALUES (?, ?, ?)",
);
const insertProject = db.prepare("INSERT INTO projects (tenant_id, name, description, created_by) VALUES (?, ?, ?, ?)");

const tenantId = (slug: string) => (db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug) as { id: number }).id;
const userId = (email: string) => (db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;

db.transaction(() => {
  // Platform super admin (not a member of any tenant)
  db.prepare(
    "INSERT OR IGNORE INTO users (email, name, password_hash, is_super_admin) VALUES (?, ?, ?, 1)",
  ).run("admin@platform.test", "Platform Admin", hash);

  insertTenant.run("Acme Inc", "acme");
  insertTenant.run("Globex Corp", "globex");
  insertUser.run("alice@acme.test", "Alice", hash);
  insertUser.run("bob@globex.test", "Bob", hash);
  insertUser.run("carol@shared.test", "Carol", hash);

  insertMember.run(tenantId("acme"), userId("alice@acme.test"), "owner");
  insertMember.run(tenantId("globex"), userId("bob@globex.test"), "owner");
  insertMember.run(tenantId("acme"), userId("carol@shared.test"), "member");
  insertMember.run(tenantId("globex"), userId("carol@shared.test"), "admin");

  const count = (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c;
  if (count === 0) {
    insertProject.run(tenantId("acme"), "Acme Website", "Only Acme can see this", userId("alice@acme.test"));
    insertProject.run(tenantId("globex"), "Globex Rollout", "Only Globex can see this", userId("bob@globex.test"));
  }
})();

console.log("seeded. login with any of these (password: password123):");
console.log("  admin@platform.test -> SUPER ADMIN (creates tenants)");
console.log("  alice@acme.test   -> Acme (owner)");
console.log("  bob@globex.test   -> Globex (owner)");
console.log("  carol@shared.test -> Acme (member) + Globex (admin)");
