import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import FindSkills from "./pages/FindSkills";
import NewSkill from "./pages/NewSkill";
import Sessions from "./pages/Sessions";
import Availability from "./pages/Availability";
import AdminReports from "./pages/AdminReports";
import AdminSkills from "./pages/AdminSkills";
import AdminUsers from "./pages/AdminUsers";
import AdminSessions from "./pages/AdminSessions";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* If you want availability to be public, keep it here.
              If it should require login, move it into the protected section below. */}
          <Route path="/availability" element={<Availability />} />

          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/skills/find" element={<FindSkills />} />
            <Route path="/skills/new" element={<NewSkill />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/skills" element={<AdminSkills />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sessions" element={<AdminSessions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
