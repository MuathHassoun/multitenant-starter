export type Role = "owner" | "admin" | "member";

export type User = { id: number; email: string; name: string; isSuperAdmin: boolean };
export type TenantRef = { id: number; name: string; slug: string; role: Role };
export type Me = { user: User; tenant: TenantRef | null; tenants: TenantRef[] };

export type Project = { id: number; name: string; description: string; created_at: string };
export type Member = { id: number; name: string; email: string; role: Role };
export type AdminTenant = {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  member_count: number;
  created_at: string;
};
