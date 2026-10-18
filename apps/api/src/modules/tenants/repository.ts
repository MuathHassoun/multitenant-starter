import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { ApiError } from "@/lib/http";
import type { Role } from "@/lib/session";

export type TenantRow = { id: number; name: string; slug: string; is_active: number; created_at: string };

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function listTenants() {
  return db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM memberships m WHERE m.tenant_id = t.id) AS member_count
         FROM tenants t ORDER BY t.id DESC`,
    )
    .all();
}

export function setTenantActive(id: number, active: boolean) {
  const res = db.prepare("UPDATE tenants SET is_active = ? WHERE id = ?").run(active ? 1 : 0, id);
  if (res.changes === 0) throw new ApiError(404, "Tenant not found");
}

/** Tenants a user belongs to (used for login + the tenant switcher). */
export function listTenantsForUser(userId: number) {
  return db
    .prepare(
      `SELECT t.id, t.name, t.slug, m.role
         FROM memberships m JOIN tenants t ON t.id = m.tenant_id
        WHERE m.user_id = ? AND t.is_active = 1 ORDER BY t.name`,
    )
    .all(userId) as { id: number; name: string; slug: string; role: Role }[];
}

/**
 * Creates a tenant and makes `owner` its owner. If the owner e-mail has no account yet, one is created.
 * Everything happens in ONE transaction: either the whole tenant exists or nothing does.
 */
export function createTenantWithOwner(input: {
  name: string;
  slug?: string;
  ownerEmail: string;
  ownerName?: string;
  ownerPassword?: string;
}) {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw new ApiError(400, "Invalid slug");

  return db.transaction(() => {
    if (db.prepare("SELECT 1 FROM tenants WHERE slug = ?").get(slug)) {
      throw new ApiError(409, `Slug "${slug}" is already taken`);
    }
    const tenantId = Number(
      db.prepare("INSERT INTO tenants (name, slug) VALUES (?, ?)").run(input.name, slug).lastInsertRowid,
    );

    let owner = db.prepare("SELECT id FROM users WHERE email = ?").get(input.ownerEmail) as { id: number } | undefined;
    let temporaryPassword: string | null = null;

    if (!owner) {
      temporaryPassword = input.ownerPassword ?? Math.random().toString(36).slice(2, 12);
      const hash = bcrypt.hashSync(temporaryPassword, 10);
      const id = Number(
        db
          .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
          .run(input.ownerEmail, input.ownerName || input.ownerEmail.split("@")[0], hash).lastInsertRowid,
      );
      owner = { id };
    }

    db.prepare("INSERT INTO memberships (tenant_id, user_id, role) VALUES (?, ?, 'owner')").run(tenantId, owner.id);

    return { tenant: { id: tenantId, name: input.name, slug }, ownerUserId: owner.id, temporaryPassword };
  })();
}
