import { z } from "zod";
import { json, parseBody } from "@/lib/http";
import { tenantRoute } from "@/lib/route";
import { addMember, listMembers } from "@/modules/members/repository";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const GET = tenantRoute(async (_req, ctx) => json(listMembers(ctx.tenantId)));

export const POST = tenantRoute(
  async (req, ctx) => json(addMember(ctx.tenantId, await parseBody(req, schema)), 201),
  { roles: ["owner", "admin"] },
);
