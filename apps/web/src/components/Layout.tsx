import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { me, switchTenant, logout } = useAuth();
  if (!me) return null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 16, alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 12 }}>
        <strong>Multi-tenant Starter</strong>
        <nav style={{ display: "flex", gap: 12, flex: 1 }}>
          {me.tenant && <NavLink to="/projects">Projects</NavLink>}
          {me.tenant && <NavLink to="/members">Members</NavLink>}
          {me.user.isSuperAdmin && <NavLink to="/admin/tenants">Admin</NavLink>}
        </nav>

        {me.tenants.length > 0 && (
          <select value={me.tenant?.id ?? ""} onChange={(e) => switchTenant(Number(e.target.value))}>
            {me.tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.role})
              </option>
            ))}
          </select>
        )}
        <span>{me.user.name}</span>
        <button onClick={logout}>Logout</button>
      </header>
      <main style={{ paddingTop: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
