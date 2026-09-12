import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Worklist } from "./pages/Worklist";
import { logout } from "./lib/api";

function loggedIn() {
  return localStorage.getItem("loggedIn") === "true";
}

function Protected({ children }: { children: JSX.Element }) {
  return loggedIn() ? children : <Navigate to="/login" replace />;
}

function TopBar() {
  const navigate = useNavigate();
  if (!loggedIn()) return null;

  async function handleLogout() {
    await logout();
    localStorage.removeItem("loggedIn");
    navigate("/login");
  }

  return (
    <div className="top-bar">
      <div className="brand">Radiqon<span>Viewer</span></div>
      <button onClick={handleLogout}>Sign out</button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/worklist" element={<Protected><Worklist /></Protected>} />
        <Route path="*" element={<Navigate to="/worklist" replace />} />
      </Routes>
    </>
  );
}
