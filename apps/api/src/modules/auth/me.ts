import { db } from "@/db/client";
import { listTenantsForUser } from "@/modules/tenants/repository";

/** Shape returned by login / switch / me: who I am, which tenant is active, and which tenants I can switch to. */
export function buildMe(userId: number, activeTenantId: number | null) {
  const user = db.prepare("SELECT id, email, name, is_super_admin FROM users WHERE id = ?").get(userId) as {
    id: number;
    email: string;
    name: string;
    is_super_admin: number;
  };
  const tenants = listTenantsForUser(userId);
  return {
    user: { id: user.id, email: user.email, name: user.name, isSuperAdmin: !!user.is_super_admin },
    tenant: tenants.find((t) => t.id === activeTenantId) ?? null,
    tenants,
  };
}
