import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Cadastro     from "../pages/Cadastro";
import Login        from "../pages/Login";
import Home         from "../pages/Home";
import Estatisticas from "../pages/Estatisticas";
import Campeonato   from "../pages/Campeonato";
import Presenca     from "../pages/Presenca";
import Jogos        from "../pages/Jogos";
import Financeiro   from "../pages/Financeiro";
import Jogadores    from "../pages/Jogadores";
import Calendario   from "../pages/Calendario";
import Midia        from "../pages/Midia";
import Admin        from "../pages/Admin";

// ─── Verifica se o token JWT ainda é válido ───────────────────────────────────
function tokenValido() {
  const token = localStorage.getItem("token");
  const user  = localStorage.getItem("user");

  if (!token || !user) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      // Token expirado — limpa o storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return false;
  }
}

// ─── Rota protegida (usuário logado) ─────────────────────────────────────────
function PrivateRoute({ children }) {
  if (!tokenValido()) return <Navigate to="/login" />;
  return children;
}

// ─── Rota protegida (somente admin) ──────────────────────────────────────────
function AdminRoute({ children }) {
  if (!tokenValido()) return <Navigate to="/login" />;

  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user?.isAdmin) return <Navigate to="/home" />;

  return children;
}

const P = ({ children }) => <PrivateRoute>{children}</PrivateRoute>;
const A = ({ children }) => <AdminRoute>{children}</AdminRoute>;

export default function RouterApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<Cadastro />} />
        <Route path="/login" element={<Login />} />

        <Route path="/home"         element={<P><Home /></P>} />
        <Route path="/estatisticas" element={<P><Estatisticas /></P>} />
        <Route path="/campeonato"   element={<P><Campeonato /></P>} />
        <Route path="/presenca"     element={<P><Presenca /></P>} />
        <Route path="/jogos"        element={<P><Jogos /></P>} />
        <Route path="/financeiro"   element={<P><Financeiro /></P>} />
        <Route path="/jogadores"    element={<P><Jogadores /></P>} />
        <Route path="/calendario"   element={<P><Calendario /></P>} />
        <Route path="/midia"        element={<P><Midia /></P>} />
        <Route path="/admin"        element={<A><Admin /></A>} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}