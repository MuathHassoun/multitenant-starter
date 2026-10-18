import { SignJWT, jwtVerify } from "jose";
import { ApiError } from "./http";

export type Role = "owner" | "admin" | "member";
export type Auth = { userId: number; tenantId: number | null };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET is required");
    return new TextEncoder().encode("dev-only-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

/** The token only says WHO the user is and WHICH tenant is active. Permissions are re-checked in the DB on each request. */
export function signToken(userId: number, tenantId: number | null) {
  return new SignJWT({ tid: tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readAuth(req: Request): Promise<Auth> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Missing token");
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: Number(payload.sub), tenantId: (payload.tid as number | null) ?? null };
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}
