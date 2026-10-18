import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminTenants from "./pages/AdminTenants";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Members from "./pages/Members";
import Projects from "./pages/Projects";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />

          <Route element={<ProtectedRoute require="tenant" />}>
            <Route path="projects" element={<Projects />} />
            <Route path="members" element={<Members />} />
            {/* add new tenant-scoped pages here */}
          </Route>

          <Route element={<ProtectedRoute require="superAdmin" />}>
            <Route path="admin/tenants" element={<AdminTenants />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
