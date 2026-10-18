import { z } from "zod";
import { json, parseBody } from "@/lib/http";
import { tenantRoute } from "@/lib/route";
import { createProject, listProjects } from "@/modules/projects/repository";

const schema = z.object({ name: z.string().min(1).max(120), description: z.string().max(2000).optional() });

export const GET = tenantRoute(async (_req, ctx) => json(listProjects(ctx.tenantId)));

export const POST = tenantRoute(async (req, ctx) => {
  const data = await parseBody(req, schema);
  return json(createProject(ctx.tenantId, ctx.userId, data), 201);
});
