import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { ApiError } from "@/lib/http";
import type { Role } from "@/lib/session";

export function listMembers(tenantId: number) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, m.role, m.created_at
         FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.tenant_id = ? ORDER BY m.id`,
    )
    .all(tenantId);
}

/** Adds an existing user, or creates one with a temporary password, then links them to the tenant. */
export function addMember(tenantId: number, data: { email: string; name?: string; role: Role }) {
  return db.transaction(() => {
    let user = db.prepare("SELECT id FROM users WHERE email = ?").get(data.email) as { id: number } | undefined;
    let temporaryPassword: string | null = null;
    if (!user) {
      temporaryPassword = Math.random().toString(36).slice(2, 12);
      const id = Number(
        db
          .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
          .run(data.email, data.name || data.email.split("@")[0], bcrypt.hashSync(temporaryPassword, 10)).lastInsertRowid,
      );
      user = { id };
    }
    if (db.prepare("SELECT 1 FROM memberships WHERE tenant_id = ? AND user_id = ?").get(tenantId, user.id)) {
      throw new ApiError(409, "User is already a member");
    }
    db.prepare("INSERT INTO memberships (tenant_id, user_id, role) VALUES (?, ?, ?)").run(tenantId, user.id, data.role);
    return { userId: user.id, temporaryPassword };
  })();
}

export function removeMember(tenantId: number, userId: number) {
  const target = db.prepare("SELECT role FROM memberships WHERE tenant_id = ? AND user_id = ?").get(tenantId, userId) as
    | { role: Role }
    | undefined;
  if (!target) throw new ApiError(404, "Member not found");
  if (target.role === "owner") {
    const owners = (db.prepare("SELECT COUNT(*) AS c FROM memberships WHERE tenant_id = ? AND role = 'owner'").get(tenantId) as { c: number }).c;
    if (owners <= 1) throw new ApiError(400, "Cannot remove the last owner");
  }
  db.prepare("DELETE FROM memberships WHERE tenant_id = ? AND user_id = ?").run(tenantId, userId);
}
