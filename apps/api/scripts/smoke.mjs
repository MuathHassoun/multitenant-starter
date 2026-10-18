// Run with the API up and the DB seeded:  npm run smoke -w apps/api
// Verifies the things that matter in a multi-tenant app: admin creates tenants, and tenants can't see each other.
const BASE = process.env.API_URL ?? "http://localhost:4000";

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}

const login = (email, password = "password123", tenantSlug) =>
  call("POST", "/api/auth/login", { body: { email, password, tenantSlug } });

const admin = await login("admin@platform.test");
const alice = await login("alice@acme.test");
const bob = await login("bob@globex.test");
check("logins work", admin.status === 200 && alice.status === 200 && bob.status === 200);

// --- super admin creates a tenant ---
const slug = "smoke-" + Date.now();
const ownerEmail = `owner-${Date.now()}@smoke.test`;
const created = await call("POST", "/api/admin/tenants", {
  token: admin.data.token,
  body: { name: "Smoke Co", slug, ownerEmail },
});
check("super admin can create a tenant", created.status === 201 && created.data.temporaryPassword);
check("normal owner CANNOT create a tenant", (await call("POST", "/api/admin/tenants", { token: alice.data.token, body: { name: "Nope", ownerEmail: "x@y.test" } })).status === 403);
check("duplicate slug rejected", (await call("POST", "/api/admin/tenants", { token: admin.data.token, body: { name: "Dup", slug, ownerEmail: "d@y.test" } })).status === 409);

// --- the new owner can log in and starts with an empty workspace ---
const newOwner = await login(ownerEmail, created.data.temporaryPassword);
check("new tenant owner can log in with the temporary password", newOwner.status === 200 && newOwner.data.tenant.slug === slug && newOwner.data.tenant.role === "owner");
const newOwnerProjects = await call("GET", "/api/projects", { token: newOwner.data.token });
check("new tenant starts empty (sees none of the other tenants' data)", newOwnerProjects.status === 200 && newOwnerProjects.data.length === 0);

// --- isolation ---
const aliceProjects = await call("GET", "/api/projects", { token: alice.data.token });
const bobProjects = await call("GET", "/api/projects", { token: bob.data.token });
check("alice sees only Acme projects", aliceProjects.data.every((p) => p.tenant_id === alice.data.tenant.id));
check("bob sees only Globex projects", bobProjects.data.every((p) => p.tenant_id === bob.data.tenant.id));

const bobProject = bobProjects.data[0];
check("alice cannot read Bob's project by id", (await call("GET", `/api/projects/${bobProject.id}`, { token: alice.data.token })).status === 404);
check("alice cannot delete Bob's project", (await call("DELETE", `/api/projects/${bobProject.id}`, { token: alice.data.token })).status === 404);
check("no token -> 401", (await call("GET", "/api/projects")).status === 401);

// --- suspending a tenant locks it out immediately ---
const tenants = (await call("GET", "/api/admin/tenants", { token: admin.data.token })).data;
const smoke = tenants.find((t) => t.slug === slug);
await call("PATCH", `/api/admin/tenants/${smoke.id}`, { token: admin.data.token, body: { isActive: false } });
check("suspended tenant is locked out immediately (existing token)", (await call("GET", "/api/projects", { token: newOwner.data.token })).status === 403);

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
