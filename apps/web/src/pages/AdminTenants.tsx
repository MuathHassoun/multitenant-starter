import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { AdminTenant } from "../types";

/** Platform super-admin screen: create tenants (with their first owner) and suspend / reactivate them. */
export default function AdminTenants() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", ownerEmail: "", ownerName: "" });
  const [message, setMessage] = useState("");

  const load = useCallback(() => api<AdminTenant[]>("/admin/tenants").then(setTenants).catch((e) => setMessage(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function create(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await api<{ tenant: { slug: string }; temporaryPassword: string | null }>("/admin/tenants", {
        method: "POST",
        body: {
          name: form.name,
          slug: form.slug || undefined,
          ownerEmail: form.ownerEmail,
          ownerName: form.ownerName || undefined,
        },
      });
      setMessage(
        res.temporaryPassword
          ? `Tenant "${res.tenant.slug}" created. Owner temporary password: ${res.temporaryPassword} (shown once)`
          : `Tenant "${res.tenant.slug}" created. The owner already had an account.`,
      );
      setForm({ name: "", slug: "", ownerEmail: "", ownerName: "" });
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function toggle(t: AdminTenant) {
    await api(`/admin/tenants/${t.id}`, { method: "PATCH", body: { isActive: !t.is_active } });
    load();
  }

  return (
    <section>
      <h2>Tenants</h2>
      <form onSubmit={create} style={{ display: "grid", gap: 8, maxWidth: 420, marginBottom: 16 }}>
        <input value={form.name} onChange={set("name")} placeholder="Tenant name (e.g. Acme Inc)" required />
        <input value={form.slug} onChange={set("slug")} placeholder="Slug (optional, e.g. acme)" />
        <input type="email" value={form.ownerEmail} onChange={set("ownerEmail")} placeholder="Owner email" required />
        <input value={form.ownerName} onChange={set("ownerName")} placeholder="Owner name (optional)" />
        <button type="submit">Create tenant</button>
      </form>
      {message && <p>{message}</p>}
      <table cellPadding={6}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Slug</th>
            <th>Members</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.slug}</td>
              <td align="center">{t.member_count}</td>
              <td align="center">{t.is_active ? "active" : "suspended"}</td>
              <td>
                <button onClick={() => toggle(t)}>{t.is_active ? "Suspend" : "Reactivate"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
