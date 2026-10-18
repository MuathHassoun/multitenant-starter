import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Project } from "../types";

export default function Projects() {
  const { me } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const canDelete = me?.tenant?.role === "owner" || me?.tenant?.role === "admin";

  // Re-fetch whenever the active tenant changes
  const load = useCallback(() => api<Project[]>("/projects").then(setProjects).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load, me?.tenant?.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/projects", { method: "POST", body: { name } });
      setName("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    try {
      await api(`/projects/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Projects in {me?.tenant?.name}</h2>
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" required />
        <button type="submit">Add</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            {p.name} {p.description && <small>— {p.description}</small>}{" "}
            {canDelete && <button onClick={() => remove(p.id)}>Delete</button>}
          </li>
        ))}
        {projects.length === 0 && <li>No projects yet.</li>}
      </ul>
    </section>
  );
}
