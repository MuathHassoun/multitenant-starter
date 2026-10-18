import { z } from "zod";
import { json, parseBody } from "@/lib/http";
import { superAdminRoute } from "@/lib/route";
import { setTenantActive } from "@/modules/tenants/repository";

const schema = z.object({ isActive: z.boolean() });

/** Suspend / reactivate a tenant. Suspended tenants are rejected by tenantRoute immediately. */
export const PATCH = superAdminRoute(async (req, _auth, { id }) => {
  setTenantActive(Number(id), (await parseBody(req, schema)).isActive);
  return json({ ok: true });
});
