import { z } from "zod";
import { ApiError, json, parseBody } from "@/lib/http";
import { tenantRoute } from "@/lib/route";
import { deleteProject, getProject, updateProject } from "@/modules/projects/repository";

const patchSchema = z.object({ name: z.string().min(1).max(120).optional(), description: z.string().max(2000).optional() });

export const GET = tenantRoute(async (_req, ctx, { id }) => {
  const project = getProject(ctx.tenantId, Number(id));
  if (!project) throw new ApiError(404, "Project not found"); // 404 (not 403) for other tenants' ids: don't leak existence
  return json(project);
});

export const PATCH = tenantRoute(async (req, ctx, { id }) => {
  const project = updateProject(ctx.tenantId, Number(id), await parseBody(req, patchSchema));
  if (!project) throw new ApiError(404, "Project not found");
  return json(project);
});

export const DELETE = tenantRoute(
  async (_req, ctx, { id }) => {
    if (!deleteProject(ctx.tenantId, Number(id))) throw new ApiError(404, "Project not found");
    return json({ ok: true });
  },
  { roles: ["owner", "admin"] },
);
