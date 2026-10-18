# Multi-tenant Starter

A reusable project skeleton for building **multi-tenant SaaS applications**: one codebase and one database that safely serve many independent customers ("tenants"), each with its own users, roles, and data.

It is a **starting point, not a finished product**. The multi-tenancy foundation (tenant isolation, roles, a platform admin who creates tenants, tenant switching) is implemented, wired end to end, and covered by an automated isolation check. Everything product-specific (your entities, screens, business rules, branding) is yours to build on top.

> **Is what is here good enough to start with?** Yes. The structure and the core pieces in this repo are solid and sufficient to begin a real project. The [Improvements](#improvements-and-roadmap) section lists optional upgrades you can adopt later as the project grows. None of them are required to get started.

---

## Table of contents

- [What and why](#what-and-why)
- [What is included](#what-is-included)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Try it: a 2-minute walkthrough](#try-it-a-2-minute-walkthrough)
- [Core concepts](#core-concepts)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Database and migrations](#database-and-migrations)
- [Adding a new tenant-scoped feature](#adding-a-new-tenant-scoped-feature)
- [Using this repo as a template for a new project](#using-this-repo-as-a-template-for-a-new-project)
- [Testing](#testing)
- [Building and deploying](#building-and-deploying)
- [Security notes and known limitations](#security-notes-and-known-limitations)
- [Improvements and roadmap](#improvements-and-roadmap)
- [Other tenancy strategies](#other-tenancy-strategies)
- [Troubleshooting](#troubleshooting)

---

## What and why

In a multi-tenant application, many customers (companies, teams, workspaces) use the same running application, but each must only ever see its own data. Getting this wrong leaks one customer's data to another, so the isolation rules should be built in once, in one place, and reused for every feature.

This repo gives you that foundation:

- **Tenants** (workspaces) are created by a **platform super admin**.
- **Users** are global accounts that can belong to **one or many tenants**, with a **role per tenant** (`owner`, `admin`, `member`).
- Every request is checked against the database for membership, role, and tenant status.
- Data tables carry a `tenant_id`, and all queries are written through repository functions that always filter by it.

Typical use: copy this repo, delete the demo `projects` feature, add your own entities by following the same pattern, and ship.

## What is included

- Platform **super admin** screen: create a tenant together with its first owner, suspend / reactivate tenants
- **Tenant users** with roles (`owner`, `admin`, `member`) and per-tenant member management
- **Tenant switcher** for users who belong to several tenants
- **JWT** login, with the active tenant carried in the token and re-verified in the database on every request
- A demo tenant-scoped entity (`projects`) showing the pattern to copy
- Plain-SQL **migration runner** and **seed** script for a local SQLite database
- Automated **tenant-isolation smoke test**
- Typed end to end (TypeScript in both apps), input validation with Zod

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router |
| Backend | Next.js 15 (route handlers only, no pages), TypeScript |
| Database | SQLite via `better-sqlite3` (local file, plain `.sql` migrations) |
| Auth | JWT (`jose`, HS256), passwords hashed with `bcryptjs` |
| Validation | Zod |
| Monorepo | npm workspaces |

The backend uses Next.js purely as an API server. All user interface lives in the separate React app.

## Quick start

**Prerequisites:** Node.js 20.19+ (or 22.12+) and npm. `better-sqlite3` ships prebuilt binaries for common platforms; if your platform needs to compile it, you also need a C/C++ toolchain.

```bash
# 1. Install all dependencies (both apps, one command)
npm install

# 2. Create your environment file and set a real secret
cp apps/api/.env.example apps/api/.env

# 3. Create the database tables and load demo data
npm run db:migrate
npm run db:seed

# 4. Start both apps (API on :4000, web on :5173)
npm run dev
```

Open <http://localhost:5173>.

### Root scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API (`:4000`) and the web app (`:5173`) together |
| `npm run db:migrate` | Applies any pending SQL migrations to the local database |
| `npm run db:seed` | Loads demo tenants, users, and projects |
| `npm run build` | Production build of both apps |
| `npm run typecheck` | TypeScript check of both apps |
| `npm run smoke -w apps/api` | Runs the tenant-isolation checks (the API must be running) |

To reset the database to a clean state:

```bash
rm -f apps/api/data/app.db apps/api/data/app.db-shm apps/api/data/app.db-wal
npm run db:migrate && npm run db:seed
```

### Demo accounts

All demo accounts use the password `password123`.

| Email | Role |
|---|---|
| `admin@platform.test` | **Super admin**: creates and suspends tenants, belongs to no tenant |
| `alice@acme.test` | Owner of **Acme** |
| `bob@globex.test` | Owner of **Globex** |
| `carol@shared.test` | Member of Acme **and** admin of Globex (use this to try the tenant switcher) |

## Try it: a 2-minute walkthrough

1. **Create a tenant as the platform admin.** Sign in as `admin@platform.test`. You land on **Admin > Tenants**. Fill in a tenant name, an owner email (for example `owner@test.com`), and press **Create tenant**. Copy the temporary password shown; it is displayed only once.
2. **Sign in as the new owner.** Log out, then sign in with the owner email and the temporary password. The new workspace starts empty.
3. **See isolation in action.** Sign in as `alice@acme.test` and as `bob@globex.test` in turn. Each sees only their own tenant's projects.
4. **Try the switcher.** Sign in as `carol@shared.test` and change the workspace in the header dropdown. The project list and her role change with it.
5. **Suspend a tenant.** As the admin, press **Suspend** on a tenant. Its users lose access immediately, even with a still-valid token.

## Core concepts

### Tenancy model

**Shared database, shared schema, a `tenant_id` column on every tenant-owned table.** Users are global and join tenants through a `memberships` table (many-to-many, with a role per tenant).

```
tenants ──< memberships >── users (is_super_admin)
   │
   └──< projects (tenant_id)      <- copy this pattern for every new entity
```

| Table | Purpose |
|---|---|
| `tenants` | One row per customer workspace (`name`, unique `slug`, `is_active`) |
| `users` | Global accounts (`email`, `password_hash`, `is_super_admin`) |
| `memberships` | Links a user to a tenant with a role: `owner`, `admin`, or `member` |
| `projects` | Demo entity owned by a tenant (has `tenant_id`) |
| `_migrations` | Bookkeeping for the migration runner |

### Actors

1. **Super admin** (`users.is_super_admin = 1`): the platform operator. Creates tenants, assigns the first owner, suspends or reactivates tenants. Is not a member of any tenant.
2. **Tenant owner / admin**: manages members and data inside one tenant.
3. **Tenant member**: uses the tenant's data.

| Action | member | admin | owner | super admin |
|---|:-:|:-:|:-:|:-:|
| Read and create projects | yes | yes | yes | no |
| Delete projects | no | yes | yes | no |
| List members | yes | yes | yes | no |
| Add / remove members | no | yes | yes | no |
| Create / suspend tenants | no | no | no | yes |

### Request flow

```
Browser ──Bearer JWT──> route wrapper (apps/api/src/lib/route.ts)
                          ├─ publicRoute      no auth (login)
                          ├─ authRoute        logged-in user, no tenant needed (me, switch tenant)
                          ├─ superAdminRoute  platform admin only (/api/admin/*)
                          └─ tenantRoute      resolves the tenant from the JWT, RE-CHECKS membership and
                                              tenant status in the DB, optionally enforces roles, and hands
                                              the handler a TenantCtx
                                                      │
                                         repository.fn(ctx.tenantId, ...)   <- tenant_id always in WHERE
```

The JWT only says **who** the user is and **which tenant is active** (`sub`, `tid`; HS256, 7-day expiry). Permissions are never read from the token; they are looked up in the database on each request.

### The golden rules

These rules are what keep tenants isolated. Follow them for every feature you add.

1. The tenant id **never** comes from the request body, query string, or URL. It comes only from `TenantCtx` (derived from the verified token and membership).
2. Every repository function takes `tenantId` as its **first argument** and filters by it in SQL.
3. Rows that belong to another tenant respond with **404**, not 403, so their existence is not revealed.
4. Membership and tenant status are re-checked in the database on **every** request, so removed users and suspended tenants lose access immediately, even with a valid token.

## API reference

All endpoints are under `/api` and exchange JSON. Authenticated endpoints expect `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Body: `email`, `password`, optional `tenantSlug`. Returns `token`, `user`, active `tenant`, and all `tenants` |
| POST | `/auth/switch` | logged in | Body: `tenantId`. Returns a new token for another tenant the user belongs to |
| GET | `/me` | logged in | Current user, active tenant, and tenant list |
| GET | `/projects` | tenant member | List the active tenant's projects |
| POST | `/projects` | tenant member | Create a project |
| GET | `/projects/:id` | tenant member | Get one project (404 if it belongs to another tenant) |
| PATCH | `/projects/:id` | tenant member | Update a project |
| DELETE | `/projects/:id` | owner, admin | Delete a project |
| GET | `/members` | tenant member | List members of the active tenant |
| POST | `/members` | owner, admin | Add a member by email (creates the account with a temporary password if the email is new) |
| DELETE | `/members/:userId` | owner, admin | Remove a member (the last owner cannot be removed) |
| GET | `/admin/tenants` | super admin | List all tenants with member counts |
| POST | `/admin/tenants` | super admin | Create a tenant and its first owner |
| PATCH | `/admin/tenants/:id` | super admin | Body: `{ "isActive": boolean }`. Suspend or reactivate |

Error responses are `{ "error": "message" }` with the status codes `400` (validation), `401` (missing or invalid token), `403` (not allowed), `404` (not found), and `409` (conflict, for example a taken slug).

## Project structure

```
multitenant-starter/
├── package.json                 npm workspaces root + shared scripts (dev, build, db:*, typecheck)
├── .gitignore
├── README.md
└── apps/
    ├── api/                     BACKEND: Next.js used as an API server (no pages)
    │   ├── package.json
    │   ├── next.config.mjs      keeps the native better-sqlite3 module out of the bundle
    │   ├── tsconfig.json        includes the "@/*" -> "src/*" path alias
    │   ├── .env.example         copy to .env
    │   ├── data/                SQLite file lives here (created at runtime, git-ignored)
    │   ├── scripts/
    │   │   ├── migrate.ts       applies src/db/migrations/*.sql in order, once each
    │   │   ├── seed.ts          demo super admin, tenants, users, and projects
    │   │   └── smoke.mjs        end-to-end tenant-isolation checks against a running API
    │   └── src/
    │       ├── db/
    │       │   ├── client.ts            opens the SQLite connection (WAL mode, foreign keys on)
    │       │   └── migrations/          numbered SQL files, e.g. 001_init.sql
    │       ├── lib/                     cross-cutting infrastructure used by every feature
    │       │   ├── http.ts              ApiError, JSON helper, error handler, body validation
    │       │   ├── session.ts           sign and verify JWTs, role types
    │       │   └── route.ts             the four route wrappers (public / auth / superAdmin / tenant)
    │       ├── modules/                 business data access, one folder per feature
    │       │   ├── auth/me.ts           builds the "who am I and which tenants" response
    │       │   ├── tenants/             list, create (with owner), suspend, tenants-for-user
    │       │   ├── members/             list, add, remove members
    │       │   └── projects/            demo tenant-scoped entity: the pattern to copy
    │       │       └── repository.ts    ALL SQL for the feature lives here
    │       └── app/api/                 HTTP endpoints, thin: validate -> repository -> JSON
    │           ├── auth/login/  auth/switch/  me/
    │           ├── projects/  projects/[id]/
    │           ├── members/   members/[userId]/
    │           └── admin/tenants/  admin/tenants/[id]/
    │
    └── web/                     FRONTEND: React + Vite single-page app
        ├── index.html
        ├── vite.config.ts       dev server on :5173, proxies /api to the API on :4000
        └── src/
            ├── main.tsx         app entry: router + auth provider
            ├── App.tsx          route table (public, tenant, super-admin sections)
            ├── types.ts         shared TypeScript types for API responses
            ├── api/client.ts    fetch wrapper that attaches the token and surfaces errors
            ├── auth/AuthContext.tsx   current user, active tenant; login, switchTenant, logout
            ├── components/
            │   ├── Layout.tsx           header with navigation and the tenant switcher
            │   └── ProtectedRoute.tsx   guards routes: user | tenant | superAdmin
            └── pages/
                ├── Login.tsx  Home.tsx
                ├── Projects.tsx  Members.tsx      tenant screens
                └── AdminTenants.tsx               platform admin screen
```

### What each part is for

| Folder / file | Purpose | When you touch it |
|---|---|---|
| `apps/api/src/app/api/**` | The HTTP surface. Each `route.ts` validates input, calls a repository, returns JSON | Every time you add an endpoint |
| `apps/api/src/modules/*/repository.ts` | The only place SQL is written. Every function takes `tenantId` first | Every time you add or change data access |
| `apps/api/src/lib/route.ts` | Authentication, tenant resolution, role checks, error handling | Rarely. This is the security core |
| `apps/api/src/lib/session.ts` | JWT creation and verification | Rarely (for example to change token lifetime) |
| `apps/api/src/db/migrations/` | Schema history as numbered `.sql` files | Every schema change |
| `apps/api/scripts/` | Migration runner, seeding, isolation test | When adding demo data or isolation checks |
| `apps/web/src/api/client.ts` | One fetch wrapper for all API calls | Rarely |
| `apps/web/src/auth/` | Login state and tenant switching | Rarely |
| `apps/web/src/components/ProtectedRoute.tsx` | Route guard by access level (UX only; real enforcement is in the API) | When you add a new access level |
| `apps/web/src/pages/` | Screens | Every time you add a screen |

## Configuration

Environment variables for the API live in `apps/api/.env` (copy from `.env.example`).

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes in production** | Long random string used to sign tokens. In development a built-in fallback is used if it is missing; in production, login and every authenticated request fail with a server error until it is set |
| `DATABASE_PATH` | No | Path to the SQLite file, relative to `apps/api`. Default: `./data/app.db` |

Generate a strong secret with, for example: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## Database and migrations

- The database is a single local file (default `apps/api/data/app.db`), created automatically.
- Migrations are plain `.sql` files in `apps/api/src/db/migrations/`, named with a numeric prefix (`001_init.sql`, `002_...`). `npm run db:migrate` applies each file that has not been applied yet, in filename order, each inside a transaction, and records it in the `_migrations` table.
- **Never edit a migration after it has been applied anywhere you care about** (a deployed environment, a teammate's database). Add a new numbered file instead. Editing `001_init.sql` is fine only before your first deployment.
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`) and the database runs in WAL mode.

## Adding a new tenant-scoped feature

Example: an `invoices` feature. Follow these five steps for every new entity.

**1. Migration** (`apps/api/src/db/migrations/002_invoices.sql`). Always include `tenant_id` and an index on it:

```sql
CREATE TABLE invoices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number        TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
```

**2. Repository** (`apps/api/src/modules/invoices/repository.ts`). `tenantId` is always the first argument and always in the `WHERE` clause:

```ts
import { db } from "@/db/client";

export function listInvoices(tenantId: number) {
  return db.prepare("SELECT * FROM invoices WHERE tenant_id = ? ORDER BY id DESC").all(tenantId);
}

export function getInvoice(tenantId: number, id: number) {
  return db.prepare("SELECT * FROM invoices WHERE tenant_id = ? AND id = ?").get(tenantId, id);
}
```

**3. Route** (`apps/api/src/app/api/invoices/route.ts`). Use `tenantRoute`; take the tenant from `ctx`, never from the request. Restrict by role when needed:

```ts
import { json } from "@/lib/http";
import { tenantRoute } from "@/lib/route";
import { listInvoices } from "@/modules/invoices/repository";

export const GET = tenantRoute(async (_req, ctx) => json(listInvoices(ctx.tenantId)));
// Role-restricted example: tenantRoute(handler, { roles: ["owner", "admin"] })
```

**4. Frontend page.** Add `apps/web/src/pages/Invoices.tsx` (fetch with `api<Invoice[]>("/invoices")`) and register it inside the tenant section of `apps/web/src/App.tsx`:

```tsx
<Route element={<ProtectedRoute require="tenant" />}>
  <Route path="projects" element={<Projects />} />
  <Route path="invoices" element={<Invoices />} />   {/* new */}
</Route>
```

**5. Isolation check.** Add assertions to `apps/api/scripts/smoke.mjs` proving that one tenant cannot read or delete another tenant's invoices (expect `404`).

## Using this repo as a template for a new project

1. Click **Use this template** on GitHub (enable *Template repository* in the repo settings), or copy the folder and run `git init`.
2. Rename the packages (`@app/api`, `@app/web`) and the app title in `apps/web/index.html`.
3. Create `apps/api/.env` and set a strong `JWT_SECRET`. Do not commit it.
4. Remove the demo content once you have your first real entity: the `projects` module, routes, page, the demo rows in `scripts/seed.ts`, and the prefilled credentials and demo-account hint in `apps/web/src/pages/Login.tsx`.
5. Add your own entities with the [five steps above](#adding-a-new-tenant-scoped-feature).
6. Keep these as they are (they are the multi-tenancy core): `lib/route.ts`, `lib/session.ts`, the `tenants`, `members`, and `auth` modules, and the admin screen.
7. Decide early on the questions that are expensive to change later: how users reach a tenant (switcher vs. subdomain), whether self-signup is needed, and how strong tenant isolation must be (see [Other tenancy strategies](#other-tenancy-strategies)).

## Testing

`npm run smoke -w apps/api` (with `npm run dev` running and the database seeded) executes an end-to-end check of the behaviour that matters most in a multi-tenant app:

- Logins work for the super admin and tenant users
- The super admin can create a tenant; a normal owner cannot
- Duplicate slugs are rejected
- A newly created tenant owner can sign in with the temporary password and starts with no data
- Each tenant sees only its own projects
- One tenant cannot read or delete another tenant's project by id (404)
- Requests without a token are rejected (401)
- Suspending a tenant immediately blocks an already-issued token (403)

The script exits non-zero if any check fails, so it can run in CI. Extend it whenever you add a tenant-scoped entity.

## Building and deploying

```bash
npm run build                      # builds both apps
npm run start -w apps/api          # serves the API on :4000 (set JWT_SECRET first)
# the web build is static files in apps/web/dist
```

Notes for a real deployment:

- The web app calls `/api/...` on its own origin. In production, serve `apps/web/dist` with any static host or reverse proxy and **route `/api` to the API server** (the same job the Vite dev proxy does locally). Doing it this way also means you need no CORS configuration.
- The API **requires `JWT_SECRET`** in production.
- SQLite is a local file: put `apps/api/data` on a persistent volume, run a **single API instance**, and back the file up. If you need several instances or high write concurrency, move to PostgreSQL (see [Improvements](#improvements-and-roadmap)).
- Do **not** run `db:seed` in production, and remove the demo credentials from the login page.

## Security notes and known limitations

This starter implements tenant isolation and role checks properly, but it is intentionally minimal elsewhere. Know what is not covered before putting real users on it:

- **Token storage:** the JWT is kept in `localStorage`, which is exposed to any XSS bug. For higher-risk apps, switch to `httpOnly` cookies.
- **No refresh tokens or revocation:** tokens last 7 days. Access is still revoked immediately for removed members and suspended tenants because the database is checked on every request, but a changed password does not invalidate existing tokens.
- **Temporary passwords are shown in the UI** when an account is created. There are no e-mail invitations, e-mail verification, or password reset yet.
- **No rate limiting** on login.
- **Logical isolation only:** a query that forgets `WHERE tenant_id = ?` would leak data. This is why all SQL stays in repositories and every new entity needs a smoke check.
- **Demo data and credentials** (`seed.ts`, the prefilled login form) are for development only.

## Improvements and roadmap

The current structure is solid and **sufficient to start building on today**. Nothing below is required. Adopt items when the project actually needs them.

### Code structure (when the codebase grows)

- **Service layer:** add `modules/<feature>/service.ts` between routes and repositories once business logic becomes non-trivial. Today the logic is simple enough that it is not needed.
- **Shared types package:** add `packages/shared` so API response types are defined once and used by both apps (today they are mirrored by hand in `apps/web/src/types.ts`).
- **Feature-based frontend folders:** move from global `pages/` and `components/` to `features/projects/`, `features/members/`, and so on, as the number of screens grows.
- **Separate admin app:** move the super-admin UI into `apps/admin` for its own domain (for example `admin.yourapp.com`), smaller tenant bundles, and stricter network rules (VPN, IP allowlist, mandatory 2FA).
- **Validation schemas per module:** move Zod schemas next to their modules so routes stay thinner.
- **Environment validation:** parse and validate all environment variables once at startup.

### Quality and tooling

- A real test framework (for example Vitest) with unit and integration tests, keeping the smoke script as an end-to-end check
- ESLint and Prettier, plus a CI workflow running `typecheck`, `build`, migrations, and the smoke test
- Dockerfile and docker-compose for one-command setup and deployment

### Authentication and security

- `httpOnly` cookie sessions or short-lived access tokens with refresh tokens and revocation
- Password reset, e-mail invitations, e-mail verification
- Login rate limiting and lockout; optional 2FA (mandatory for the super admin)
- Audit log of sensitive actions (tenant creation, suspension, member changes)

### Multi-tenancy and data

- Subdomain-based tenant resolution (`acme.yourapp.com`)
- Stronger isolation options: PostgreSQL with Row Level Security, or one database file per tenant (see below)
- Optional self-service signup, tenant settings and branding, soft delete, pagination, and per-tenant limits or plans
- Billing and subscriptions

## Other tenancy strategies

This starter uses the simplest model. If your requirements change, these are the common alternatives:

| Strategy | Isolation | Cost / operations |
|---|---|---|
| **Shared DB + `tenant_id` (this starter)** | Logical (relies on code discipline) | Cheapest, simplest migrations |
| One SQLite file per tenant | Strong; easy per-tenant backup and deletion | Needs a connection-per-tenant cache and migrations run on every file |
| PostgreSQL + Row Level Security | Enforced by the database itself | Requires PostgreSQL; more setup |

Because all SQL lives in the repositories and routes receive the tenant from `TenantCtx`, switching strategy mostly affects `db/client.ts` and the repositories (for example `getDb(tenantId)` for file-per-tenant). The route wrappers stay the same.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `Cannot find module 'better-sqlite3'` or a native build error on install | Use a supported Node version (20.19+ / 22.12+). If a prebuilt binary is unavailable for your platform, install a C/C++ build toolchain and re-run `npm install` |
| Login works but the app says the account has no workspace (403) | The user has no active tenant membership. Add them to a tenant, or reactivate a suspended tenant |
| Seeded accounts do not exist | Run `npm run db:migrate` then `npm run db:seed`. Both must be run from the repo root |
| `EADDRINUSE` on port 4000 or 5173 | Another process is using the port. Stop it, or change the port in the `dev` scripts and in `vite.config.ts` (proxy target) |
| API returns 401 after changing `JWT_SECRET` | Existing tokens were signed with the old secret. Log out and sign in again |
| Browser shows CORS errors | Use the Vite dev server (`:5173`) which proxies `/api`, rather than calling `:4000` directly from another origin |
| Database seems to be in the wrong place | `DATABASE_PATH` is relative to `apps/api`. Check that the file you are inspecting is the one the API opens |