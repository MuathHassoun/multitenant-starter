import type { NextRequest } from "next/server";
import { db } from "@/db/client";
import { ApiError, handleError } from "./http";
import { readAuth, type Auth, type Role } from "./session";

type Params = Record<string, string>;
type RouteCtx = { params: Promise<Params> };

export type TenantCtx = {
  userId: number;
  tenantId: number; // <- the ONLY tenant id repositories should ever use
  tenantSlug: string;
  role: Role;
};

function wrap(fn: (req: NextRequest, params: Params) => Promise<Response>) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    try {
      return await fn(req, await ctx.params);
    } catch (e) {
      return handleError(e);
    }
  };
}

/** No authentication (login, register). */
export const publicRoute = wrap;

/** Logged-in user, no tenant needed (e.g. "list my tenants", "switch tenant"). */
export function authRoute(fn: (req: NextRequest, auth: Auth, params: Params) => Promise<Response>) {
  return wrap(async (req, params) => fn(req, await readAuth(req), params));
}

/** Platform super admin only (tenant management). */
export function superAdminRoute(fn: (req: NextRequest, auth: Auth, params: Params) => Promise<Response>) {
  return wrap(async (req, params) => {
    const auth = await readAuth(req);
    const row = db.prepare("SELECT is_super_admin FROM users WHERE id = ?").get(auth.userId) as
      | { is_super_admin: number }
      | undefined;
    if (!row?.is_super_admin) throw new ApiError(403, "Super admin only");
    return fn(req, auth, params);
  });
}

/**
 * Tenant-scoped route. Resolves the active tenant from the token, then re-verifies in the DB that
 * the user is still a member of an ACTIVE tenant (so removed members / suspended tenants lose access immediately).
 */
export function tenantRoute(
  fn: (req: NextRequest, ctx: TenantCtx, params: Params) => Promise<Response>,
  opts: { roles?: Role[] } = {},
) {
  return wrap(async (req, params) => {
    const auth = await readAuth(req);
    if (auth.tenantId == null) throw new ApiError(403, "No active workspace selected");

    const row = db
      .prepare(
        `SELECT m.role, t.slug, t.is_active
           FROM memberships m JOIN tenants t ON t.id = m.tenant_id
          WHERE m.user_id = ? AND m.tenant_id = ?`,
      )
      .get(auth.userId, auth.tenantId) as { role: Role; slug: string; is_active: number } | undefined;

    if (!row) throw new ApiError(403, "You are not a member of this workspace");
    if (!row.is_active) throw new ApiError(403, "This workspace is suspended");
    if (opts.roles && !opts.roles.includes(row.role)) throw new ApiError(403, "Insufficient role");

    return fn(req, { userId: auth.userId, tenantId: auth.tenantId, tenantSlug: row.slug, role: row.role }, params);
  });
}
