import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";
import "../style/Login.css";

// ─── Verifica se já tem sessão ativa ─────────────────────────────────────────
function tokenValido() {
  const token = localStorage.getItem("token");
  const user  = localStorage.getItem("user");
  if (!token || !user) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  // ─── Se já estiver logado, vai direto pra home ───────────────────────────
  useEffect(() => {
    if (tokenValido()) navigate("/home");
  }, []);

  const handle = (campo) => (e) =>
    setForm((old) => ({ ...old, [campo]: e.target.value }));

  const submit = async () => {
    setErro("");

    if (!form.email || !form.senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);
      const data = await login(form.email, form.senha);

      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/home");
    } catch (err) {
      setErro(err.message || "E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="login-wrap">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <span className="tagline">⚽ Player Card</span>
          <h1 className="login-title">Entrar</h1>
          <p className="login-sub">Acesse seu perfil de jogador.</p>
        </div>

        {/* Formulário */}
        <div className="login-form">
          <input
            className="input"
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={handle("email")}
            onKeyDown={handleKeyDown}
          />
          <input
            className="input"
            type="password"
            placeholder="Senha"
            value={form.senha}
            onChange={handle("senha")}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Erro */}
        {erro && <div className="msg erro">⚠ {erro}</div>}

        {/* Botão */}
        <button
          className="btn-primary"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar →"}
        </button>

        <p className="cadastro-link">
          Não tem conta? <Link to="/">Criar perfil</Link>
        </p>

      </div>
    </div>
  );
}