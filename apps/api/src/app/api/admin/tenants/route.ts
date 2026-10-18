import { z } from "zod";
import { json, parseBody } from "@/lib/http";
import { superAdminRoute } from "@/lib/route";
import { createTenantWithOwner, listTenants } from "@/modules/tenants/repository";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(60).optional(), // defaults to slugified name
  ownerEmail: z.string().email(),
  ownerName: z.string().optional(),
  ownerPassword: z.string().min(8).optional(), // omit to auto-generate a temporary one
});

export const GET = superAdminRoute(async () => json(listTenants()));

/** Creates a tenant + its first owner (creating the owner account if the e-mail is new). */
export const POST = superAdminRoute(async (req) => json(createTenantWithOwner(await parseBody(req, schema)), 201));
