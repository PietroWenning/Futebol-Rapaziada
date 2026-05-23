import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cadastro, criarJogador, login } from "../services/api";
import "../style/Cadastro.css";

const POSICOES = [
  "Goleiro","Zagueiro","Lateral Direito","Lateral Esquerdo","Meia","Centroavante",
];

function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function validar(form) {
  const { nome, email, senha, confirmarSenha, posicao, idade } = form;
  if (!nome || !email || !senha || !confirmarSenha || !posicao || !idade)
    return "Preencha todos os campos obrigatórios.";
  if (!validarEmail(email)) return "Insira um e-mail válido.";
  if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (senha !== confirmarSenha) return "As senhas não coincidem.";
  const n = Number(idade);
  if (isNaN(n) || n < 5 || n > 99) return "Idade inválida (5 a 99).";
  return null;
}

export default function Cadastro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "", email: "", senha: "", confirmarSenha: "",
    posicao: "", idade: "", perna_boa: "Direita",
  });

  const [fotoBase64, setFotoBase64] = useState("");
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState("");

  const handle = c => e => setForm(o => ({ ...o, [c]: e.target.value }));

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErro("A foto deve ter no máximo 2 MB."); return; }
    setErro("");
    const reader = new FileReader();
    reader.onload = () => {
      setFotoBase64(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setErro(""); setSucesso("");
    const erroVal = validar(form);
    if (erroVal) { setErro(erroVal); return; }

    try {
      setLoading(true);

      // 1. Cria conta
      await cadastro(form.nome, form.email, form.senha);

      // 2. Faz login automático para obter o token
      const dataLogin = await login(form.email, form.senha);

      // 3. Salva token e user no localStorage
      localStorage.setItem("token", dataLogin.token);
      localStorage.setItem("user", JSON.stringify({
        id: dataLogin.user.id,
        nome: dataLogin.user.nome,
        email: dataLogin.user.email,
        isAdmin: dataLogin.user.isAdmin ?? false,
      }));

      // 4. Cria perfil do jogador
      try {
        await criarJogador({
          nome: form.nome,
          posicao: form.posicao,
          idade: Number(form.idade),
          perna_boa: form.perna_boa,
          fotoUrl: fotoBase64 || "",
          overall: 0,
          time: "",
          gols: 0,
          assistencias: 0,
          jogos: 0,
          cartoes: 0,
          cartoes_vermelhos: 0,
          vitorias: 0,
          empates: 0,
          derrotas: 0,
          desarmes: 0,
          defesas: 0,  // corrigido: era "defesa" (singular), campo correto é "defesas"
        });
      } catch {
        setErro("Conta criada, mas erro ao salvar perfil. Entre em contato com o suporte.");
        return;
      }

      setSucesso("Perfil criado com sucesso!");
      setTimeout(() => navigate("/home"), 1500);
    } catch (err) {
      setErro(err.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cad-wrap">
      <div className="cad-bg">
        <div className="cad-orb orb1" /><div className="cad-orb orb2" />
        <div className="cad-grid" />
      </div>

      <div className="cad-card">
        <div className="cad-header">
          <span className="cad-tagline">⚽ Player Card</span>
          <h1 className="cad-titulo">Cadastro do Jogador</h1>
          <p className="cad-sub">Crie sua conta e monte seu perfil.</p>
        </div>

        <div className="cad-section">
          <p className="cad-section-label">Dados da Conta</p>
          <div className="cad-grid-form">
            <input className="cad-input full" placeholder="Nome completo" value={form.nome} onChange={handle("nome")} />
            <input className="cad-input full" placeholder="E-mail" type="email" value={form.email} onChange={handle("email")} />
            <input className="cad-input" placeholder="Senha" type="password" value={form.senha} onChange={handle("senha")} />
            <input className="cad-input" placeholder="Confirmar senha" type="password" value={form.confirmarSenha} onChange={handle("confirmarSenha")} />
          </div>
        </div>

        <div className="cad-section">
          <p className="cad-section-label">Perfil do Jogador</p>
          <div className="cad-grid-form">
            <select className="cad-input full" value={form.posicao} onChange={handle("posicao")}>
              <option value="">Selecione a posição</option>
              {POSICOES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="cad-input" placeholder="Idade" type="number" min="5" max="99" value={form.idade} onChange={handle("idade")} />
            <select className="cad-input" value={form.perna_boa} onChange={handle("perna_boa")}>
              <option>Direita</option><option>Esquerda</option><option>Ambas</option>
            </select>
          </div>
        </div>

        <p className="overall-obs">⭐ Overall será definido apenas pela administração.</p>

        {erro   && <div className="cad-msg erro">⚠ {erro}</div>}
        {sucesso && <div className="cad-msg sucesso">✓ {sucesso}</div>}

        <button className="cad-btn" onClick={submit} disabled={loading}>
          {loading ? "Criando perfil..." : "Criar perfil →"}
        </button>

        <p className="cad-login-link">Já tem uma conta? <Link to="/login">Entrar</Link></p>
      </div>
    </div>
  );
}