import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import ComptableDashboard from "@/pages/ComptableDashboard";
import EnseignantDashboard from "@/pages/EnseignantDashboard";
import { Loader2 } from "lucide-react";

function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const dest = { admin: "/admin", comptable: "/comptable", enseignant: "/enseignant" }[user.role];
    return <Navigate to={dest} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  const dest = { admin: "/admin", comptable: "/comptable", enseignant: "/enseignant" }[user.role];
  return <Navigate to={dest} replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
            <Route path="/comptable" element={<Protected roles={["admin", "comptable"]}><ComptableDashboard /></Protected>} />
            <Route path="/enseignant" element={<Protected roles={["admin", "enseignant"]}><EnseignantDashboard /></Protected>} />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
