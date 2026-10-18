import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** require: "user" = logged in, "tenant" = logged in with an active workspace, "superAdmin" = platform admin. */
export default function ProtectedRoute({ require = "user" }: { require?: "user" | "tenant" | "superAdmin" }) {
  const { me, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!me) return <Navigate to="/login" replace />;
  if (require === "superAdmin" && !me.user.isSuperAdmin) return <Navigate to="/" replace />;
  if (require === "tenant" && !me.tenant) return <Navigate to="/" replace />;
  return <Outlet />;
}
