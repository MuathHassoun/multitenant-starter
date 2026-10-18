-- Multi-tenancy model: ONE shared database, every tenant-owned table has a tenant_id.
-- Users are global; they join tenants through `memberships` (so one user can belong to many tenants).

CREATE TABLE tenants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_active   INTEGER NOT NULL DEFAULT 1,   -- platform admin can suspend a tenant
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  is_super_admin INTEGER NOT NULL DEFAULT 0, -- platform-level admin: manages tenants, belongs to none
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE memberships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_memberships_user ON memberships(user_id);

-- Example tenant-owned entity. Copy this pattern for every new table:
--   1. tenant_id NOT NULL + FK
--   2. index on tenant_id
--   3. repository functions that ALWAYS filter by tenant_id
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
