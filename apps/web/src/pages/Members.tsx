import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Member } from "../types";

export default function Members() {
  const { me } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [message, setMessage] = useState("");
  const canManage = me?.tenant?.role === "owner" || me?.tenant?.role === "admin";

  const load = useCallback(() => api<Member[]>("/members").then(setMembers).catch((e) => setMessage(e.message)), []);
  useEffect(() => {
    load();
  }, [load, me?.tenant?.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await api<{ temporaryPassword: string | null }>("/members", { method: "POST", body: { email, role } });
      setMessage(res.temporaryPassword ? `Account created. Temporary password: ${res.temporaryPassword}` : "Existing user added.");
      setEmail("");
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function remove(userId: number) {
    try {
      await api(`/members/${userId}`, { method: "DELETE" });
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Members of {me?.tenant?.name}</h2>
      {canManage && (
        <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
          <select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Add member</button>
        </form>
      )}
      {message && <p>{message}</p>}
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            {m.name} ({m.email}) — <em>{m.role}</em> {canManage && <button onClick={() => remove(m.id)}>Remove</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
