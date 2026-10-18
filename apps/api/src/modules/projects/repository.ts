import { db } from "@/db/client";

// RULE: every function here takes `tenantId` first and puts it in the WHERE clause.
// Never accept a tenant id from the request body/query; it comes from TenantCtx only.

export type Project = { id: number; tenant_id: number; name: string; description: string; created_by: number | null; created_at: string };

export function listProjects(tenantId: number) {
  return db.prepare("SELECT * FROM projects WHERE tenant_id = ? ORDER BY id DESC").all(tenantId) as Project[];
}

export function getProject(tenantId: number, id: number) {
  return db.prepare("SELECT * FROM projects WHERE tenant_id = ? AND id = ?").get(tenantId, id) as Project | undefined;
}

export function createProject(tenantId: number, userId: number, data: { name: string; description?: string }) {
  const res = db
    .prepare("INSERT INTO projects (tenant_id, name, description, created_by) VALUES (?, ?, ?, ?)")
    .run(tenantId, data.name, data.description ?? "", userId);
  return getProject(tenantId, Number(res.lastInsertRowid))!;
}

export function updateProject(tenantId: number, id: number, data: { name?: string; description?: string }) {
  const current = getProject(tenantId, id);
  if (!current) return undefined;
  db.prepare("UPDATE projects SET name = ?, description = ? WHERE tenant_id = ? AND id = ?").run(
    data.name ?? current.name,
    data.description ?? current.description,
    tenantId,
    id,
  );
  return getProject(tenantId, id)!;
}

export function deleteProject(tenantId: number, id: number) {
  return db.prepare("DELETE FROM projects WHERE tenant_id = ? AND id = ?").run(tenantId, id).changes > 0;
}
