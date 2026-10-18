import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function handleError(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  if (e instanceof ZodError) return json({ error: "Validation failed", issues: e.issues }, 400);
  console.error(e);
  return json({ error: "Internal server error" }, 500);
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Body must be valid JSON");
  }
  return schema.parse(raw);
}
