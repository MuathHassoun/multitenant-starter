import { json } from "@/lib/http";
import { tenantRoute } from "@/lib/route";
import { removeMember } from "@/modules/members/repository";

export const DELETE = tenantRoute(
  async (_req, ctx, { userId }) => {
    removeMember(ctx.tenantId, Number(userId));
    return json({ ok: true });
  },
  { roles: ["owner", "admin"] },
);
