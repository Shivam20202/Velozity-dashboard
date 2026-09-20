import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { SocketProvider } from "./socket";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Users from "./pages/Users";
import  "../src/styles.css";
function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
function Inner() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <Guard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetails />} />
                  <Route path="/users" element={<Users />} />
                </Routes>
              </Layout>
            </Guard>
          }
        />
      </Routes>
    </SocketProvider>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </BrowserRouter>
  );
}
