import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db/client";
import { ApiError, json, parseBody } from "@/lib/http";
import { publicRoute } from "@/lib/route";
import { signToken } from "@/lib/session";
import { buildMe } from "@/modules/auth/me";
import { listTenantsForUser } from "@/modules/tenants/repository";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(), // pick a specific workspace; default = first one
});

export const POST = publicRoute(async (req) => {
  const body = await parseBody(req, schema);

  const user = db
    .prepare("SELECT id, password_hash, is_super_admin FROM users WHERE email = ?")
    .get(body.email) as { id: number; password_hash: string; is_super_admin: number } | undefined;
  if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tenants = listTenantsForUser(user.id);
  const active = body.tenantSlug ? tenants.find((t) => t.slug === body.tenantSlug) : tenants[0];
  if (body.tenantSlug && !active) throw new ApiError(403, "You are not a member of that workspace");
  if (!active && !user.is_super_admin) throw new ApiError(403, "Your account has no active workspace");

  const token = await signToken(user.id, active?.id ?? null);
  return json({ token, ...buildMe(user.id, active?.id ?? null) });
});
