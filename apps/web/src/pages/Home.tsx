import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Landing redirect: tenant users go to their workspace, the platform admin goes to tenant management. */
export default function Home() {
  const { me } = useAuth();
  if (me?.tenant) return <Navigate to="/projects" replace />;
  if (me?.user.isSuperAdmin) return <Navigate to="/admin/tenants" replace />;
  return <p>Your account has no workspace yet.</p>;
}
