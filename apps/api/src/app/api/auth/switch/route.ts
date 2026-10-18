import { z } from "zod";
import { ApiError, json, parseBody } from "@/lib/http";
import { authRoute } from "@/lib/route";
import { signToken } from "@/lib/session";
import { buildMe } from "@/modules/auth/me";
import { listTenantsForUser } from "@/modules/tenants/repository";

const schema = z.object({ tenantId: z.number().int() });

/** Issues a new token for another tenant the user belongs to. */
export const POST = authRoute(async (req, auth) => {
  const { tenantId } = await parseBody(req, schema);
  if (!listTenantsForUser(auth.userId).some((t) => t.id === tenantId)) {
    throw new ApiError(403, "You are not a member of that workspace");
  }
  const token = await signToken(auth.userId, tenantId);
  return json({ token, ...buildMe(auth.userId, tenantId) });
});
