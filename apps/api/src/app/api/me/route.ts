import { json } from "@/lib/http";
import { authRoute } from "@/lib/route";
import { buildMe } from "@/modules/auth/me";

export const GET = authRoute(async (_req, auth) => json(buildMe(auth.userId, auth.tenantId)));
