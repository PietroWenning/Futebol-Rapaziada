import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getJogadores, atualizarOverall,
  atualizarStats, confirmarPagamento, getAdminUsuarios,
} from "../services/api";
import "../style/Admin.css";

const API_URL = import.meta.env.VITE_API_URL ?? "https://futebol-rapaziada-lfqr.onrender.com";

export default function Admin() {
  const navigate = useNavigate();
  const [aba, setAba] = useState("overall");
  const [jogadores, setJogadores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ texto: "", tipo: "" });

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      const [rJog, rUsu] = await Promise.all([
        getJogadores(),
        getAdminUsuarios(),
      ]);
      setJogadores(rJog);
      setUsuarios(rUsu);
    } catch (err) {
      console.error(err);
      showMsg("Erro ao carregar dados.", "erro");
    } finally {
      setLoading(false);
    }
  }

  function showMsg(texto, tipo = "sucesso") {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "" }), 3000);
  }

  return (
    <div className="adm-wrap">
      <div className="adm-bg">
        <div className="adm-orb orb1" /><div className="adm-orb orb2" />
        <div className="adm-grid-bg" />
      </div>
      <div className="adm-container">
        <div className="adm-header">
          <button className="adm-back" onClick={() => navigate("/home")}>← Voltar</button>
          <div>
            <span className="adm-tagline">🔒 Área Restrita</span>
            <h1 className="adm-titulo">Painel Admin</h1>
          </div>
        </div>

        {msg.texto && (
          <div className={`adm-msg ${msg.tipo}`}>
            {msg.tipo === "sucesso" ? "✓" : "⚠"} {msg.texto}
          </div>
        )}

        <div className="adm-abas">
          {["overall","stats","pagamentos","presenca","usuarios"].map((a) => (
            <button key={a} className={`adm-aba ${aba === a ? "ativo" : ""}`} onClick={() => setAba(a)}>
              {a === "overall"    && "⭐ Overall"}
              {a === "stats"      && "📊 Estatísticas"}
              {a === "pagamentos" && "💰 Pagamentos"}
              {a === "presenca"   && "📋 Presença"}
              {a === "usuarios"   && "👥 Usuários"}
            </button>
          ))}
        </div>

        {loading ? <div className="adm-loading">Carregando...</div> : (
          <div className="adm-content">
            {aba === "overall" && (
              <AbaOverall jogadores={jogadores} onSave={async (id, dados) => {
                try { await atualizarOverall(id, dados); showMsg("Overall atualizado!"); }
                catch { showMsg("Erro ao atualizar overall.", "erro"); }
              }} />
            )}
            {aba === "stats" && (
              <AbaStats jogadores={jogadores} onSave={async (id, dados) => {
                try { await atualizarStats(id, dados); showMsg("Estatísticas atualizadas!"); carregarDados(); }
                catch { showMsg("Erro ao atualizar estatísticas.", "erro"); }
              }} />
            )}
            {aba === "pagamentos" && (
              <AbaPagamentos jogadores={jogadores} onToggle={async (id, pagou) => {
                try { await confirmarPagamento(id, pagou); showMsg(`Pagamento ${pagou ? "confirmado" : "cancelado"}!`); carregarDados(); }
                catch { showMsg("Erro ao atualizar pagamento.", "erro"); }
              }} />
            )}
            {aba === "presenca" && (
              <AbaPresenca
                jogadores={jogadores}
                onToggle={async (j) => {
                  try {
                    const token = localStorage.getItem("token");
                    const novoStatus = !(j.confirmado === 1 || j.confirmado === true);
                    await fetch(`${API_URL}/jogadores/${j.id_jogador ?? j.id}/confirmar`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ confirmado: novoStatus }),
                    });
                    showMsg(`Presença de ${j.nome?.split(" ")[0]} ${novoStatus ? "confirmada" : "removida"}!`);
                    carregarDados();
                  } catch { showMsg("Erro ao atualizar presença.", "erro"); }
                }}
              />
            )}
            {aba === "usuarios" && <AbaUsuarios usuarios={usuarios} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OVERALL ─────────────────────────────────────────────────────────────────
function AbaOverall({ jogadores, onSave }) {
  return (
    <div>
      <h2 className="adm-section-title">⭐ Editar Overall</h2>
      <div className="adm-cards">
        {jogadores.map((j) => <OverallForm key={j.id_jogador||j.id} jogador={j} onSave={onSave} />)}
      </div>
    </div>
  );
}

function OverallForm({ jogador, onSave }) {
  const [vals, setVals] = useState({
    overall: jogador.overall||0, pac: jogador.pac||0, sho: jogador.sho||0,
    pas: jogador.pas||0, dri: jogador.dri||0, def: jogador.def||0, phy: jogador.phy||0,
  });
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="adm-card">
      <div className="adm-card-header">
        {jogador.fotoUrl && <img src={jogador.fotoUrl} alt={jogador.nome} className="adm-card-foto" />}
        <div><p className="adm-card-nome">{jogador.nome}</p><p className="adm-card-pos">{jogador.posicao}</p></div>
        <span className="adm-overall-badge">{vals.overall}</span>
      </div>
      <div className="adm-atributos">
        {["overall","pac","sho","pas","dri","def","phy"].map((k) => (
          <div key={k} className="adm-attr">
            <label className="adm-attr-label">{k.toUpperCase()}</label>
            <input type="number" min="0" max="99" value={vals[k]}
              onChange={(e) => setVals((o) => ({ ...o, [k]: Number(e.target.value) }))}
              className="adm-attr-input" />
          </div>
        ))}
      </div>
      <button className="adm-btn-salvar" disabled={salvando}
        onClick={async () => { setSalvando(true); await onSave(jogador.id_jogador||jogador.id, vals); setSalvando(false); }}>
        {salvando ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function AbaStats({ jogadores, onSave }) {
  return (
    <div>
      <h2 className="adm-section-title">📊 Estatísticas</h2>
      <p className="adm-section-obs">Use os botões − e + para ajustar cada stat. O valor será somado ao atual.</p>
      <div className="adm-cards">
        {jogadores.map((j) => <StatsForm key={j.id_jogador||j.id} jogador={j} onSave={onSave} />)}
      </div>
    </div>
  );
}

function StatsForm({ jogador, onSave }) {
  const empty = { gols:0, assistencias:0, jogos:0, cartoes:0, vitorias:0, empates:0, derrotas:0, desarmes:0, defesas:0 };
  const [deltas, setDeltas] = useState(empty);
  const [salvando, setSalvando] = useState(false);

  const campos = [
    { key: "gols",        label: "Gols",     icon: "⚽" },
    { key: "assistencias",label: "Assists",  icon: "🎯" },
    { key: "jogos",       label: "Jogos",    icon: "🏟" },
    { key: "vitorias",    label: "Vitórias", icon: "🏆" },
    { key: "empates",     label: "Empates",  icon: "🤝" },
    { key: "derrotas",    label: "Derrotas", icon: "💔" },
    { key: "desarmes",    label: "Desarmes", icon: "🛡️" },
    { key: "defesas",     label: "Defesas",  icon: "🧤" },
    { key: "cartoes",     label: "Cartões",  icon: "🟨" },
  ];

  const step = (key, dir) =>
    setDeltas(o => ({ ...o, [key]: o[key] + dir }));

  const hasChanges = Object.values(deltas).some(v => v !== 0);

  return (
    <div className="adm-card adm-stats-card">
      <div className="adm-card-header">
        {jogador.fotoUrl
          ? <img src={jogador.fotoUrl} alt={jogador.nome} className="adm-card-foto" />
          : <span className="adm-pres-avatar">👤</span>
        }
        <div>
          <p className="adm-card-nome">{jogador.nome}</p>
          <p className="adm-card-pos">{jogador.posicao}</p>
        </div>
        {hasChanges && (
          <button className="adm-stats-reset" onClick={() => setDeltas(empty)} title="Resetar alterações">↺</button>
        )}
      </div>

      <div className="adm-stats-rows">
        {campos.map(({ key, label, icon }) => {
          const atual = jogador[key] || 0;
          const delta = deltas[key];
          const novo  = atual + delta;
          return (
            <div key={key} className="adm-stats-row">
              <span className="adm-stats-icon">{icon}</span>
              <span className="adm-stats-label">{label}</span>

              <div className="adm-stats-preview">
                <span className="adm-stats-atual">{atual}</span>
                {delta !== 0 && (
                  <>
                    <span className="adm-stats-arrow">→</span>
                    <span className={`adm-stats-novo ${delta > 0 ? "positivo" : "negativo"}`}>{novo}</span>
                    <span className={`adm-stats-delta ${delta > 0 ? "positivo" : "negativo"}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </>
                )}
              </div>

              <div className="adm-stepper">
                <button
                  className="adm-stepper-btn minus"
                  onClick={() => step(key, -1)}
                  disabled={novo <= 0}
                  aria-label={`Diminuir ${label}`}
                >−</button>
                <span className="adm-stepper-val" data-changed={delta !== 0}>{delta > 0 ? `+${delta}` : delta}</span>
                <button
                  className="adm-stepper-btn plus"
                  onClick={() => step(key, 1)}
                  aria-label={`Aumentar ${label}`}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="adm-btn-salvar"
        disabled={salvando || !hasChanges}
        onClick={async () => {
          setSalvando(true);
          await onSave(jogador.id_jogador||jogador.id, deltas);
          setDeltas(empty);
          setSalvando(false);
        }}
      >
        {salvando ? "Salvando..." : hasChanges ? "Salvar Alterações" : "Sem alterações"}
      </button>
    </div>
  );
}

// ─── PAGAMENTOS ──────────────────────────────────────────────────────────────
function AbaPagamentos({ jogadores, onToggle }) {
  return (
    <div>
      <h2 className="adm-section-title">💰 Controle de Pagamentos</h2>
      <div className="adm-pag-resumo">
        <div className="adm-pag-stat verde">
          <span className="adm-pag-num">{jogadores.filter(j=>j.pagou).length}</span>
          <span className="adm-pag-label">Pagaram</span>
        </div>
        <div className="adm-pag-stat vermelho">
          <span className="adm-pag-num">{jogadores.filter(j=>!j.pagou).length}</span>
          <span className="adm-pag-label">Pendentes</span>
        </div>
      </div>
      <div className="adm-pag-tabela">
        <div className="adm-pag-thead"><span>Jogador</span><span>Status</span><span>Ação</span></div>
        {jogadores.map((j) => (
          <div key={j.id_jogador||j.id} className="adm-pag-row">
            <div className="adm-pag-jogador">
              {j.fotoUrl && <img src={j.fotoUrl} alt={j.nome} className="adm-pag-foto" />}
              <div><p className="adm-pag-nome">{j.nome}</p><p className="adm-pag-pos">{j.posicao}</p></div>
            </div>
            <span className={`adm-pag-badge ${j.pagou ? "pago" : "pendente"}`}>
              {j.pagou ? "✅ Pago" : "❌ Pendente"}
            </span>
            <button className={`adm-pag-btn ${j.pagou ? "cancelar" : "confirmar"}`}
              onClick={() => onToggle(j.id_jogador||j.id, !j.pagou)}>
              {j.pagou ? "Cancelar" : "Confirmar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PRESENÇA ─────────────────────────────────────────────────────────────────
function AbaPresenca({ jogadores, onToggle }) {
  const [atualizando, setAtual] = useState({});
  const confirmados    = jogadores.filter(j => j.confirmado === 1 || j.confirmado === true);
  const naoConfirmados = jogadores.filter(j => !(j.confirmado === 1 || j.confirmado === true));

  async function toggle(j) {
    setAtual(o => ({ ...o, [j.id_jogador ?? j.id]: true }));
    await onToggle(j);
    setAtual(o => ({ ...o, [j.id_jogador ?? j.id]: false }));
  }

  return (
    <div>
      <h2 className="adm-section-title">📋 Lista de Presença</h2>

      {/* Resumo */}
      <div className="adm-pag-resumo">
        <div className="adm-pag-stat verde">
          <span className="adm-pag-num">{confirmados.length}</span>
          <span className="adm-pag-label">Confirmados</span>
        </div>
        <div className="adm-pag-stat vermelho">
          <span className="adm-pag-num">{naoConfirmados.length}</span>
          <span className="adm-pag-label">Pendentes</span>
        </div>
        <div className="adm-pag-stat" style={{ borderColor: "rgba(255,255,255,.1)" }}>
          <span className="adm-pag-num" style={{ color: "var(--text2)" }}>{jogadores.length}</span>
          <span className="adm-pag-label">Total</span>
        </div>
      </div>

      {/* Tabela confirmados */}
      <p className="adm-pres-subtitulo">✅ Confirmados ({confirmados.length})</p>
      <div className="adm-pag-tabela" style={{ marginBottom: "1rem" }}>
        <div className="adm-pag-thead"><span>Jogador</span><span>Status</span><span>Ação</span></div>
        {confirmados.length === 0
          ? <p className="adm-pres-vazio">Nenhum confirmado ainda.</p>
          : confirmados.map(j => {
            const id = j.id_jogador ?? j.id;
            return (
              <div key={id} className="adm-pag-row">
                <div className="adm-pag-jogador">
                  {j.fotoUrl
                    ? <img src={j.fotoUrl} alt={j.nome} className="adm-pag-foto" />
                    : <span className="adm-pres-avatar">👤</span>
                  }
                  <div><p className="adm-pag-nome">{j.nome}</p><p className="adm-pag-pos">{j.posicao || "—"}</p></div>
                </div>
                <span className="adm-pag-badge pago">✅ Confirmado</span>
                <button
                  className="adm-pag-btn cancelar"
                  disabled={atualizando[id]}
                  onClick={() => toggle(j)}
                >
                  {atualizando[id] ? "..." : "Remover"}
                </button>
              </div>
            );
          })
        }
      </div>

      {/* Tabela pendentes */}
      <p className="adm-pres-subtitulo">❌ Pendentes ({naoConfirmados.length})</p>
      <div className="adm-pag-tabela">
        <div className="adm-pag-thead"><span>Jogador</span><span>Status</span><span>Ação</span></div>
        {naoConfirmados.length === 0
          ? <p className="adm-pres-vazio">🎉 Todos confirmaram!</p>
          : naoConfirmados.map(j => {
            const id = j.id_jogador ?? j.id;
            return (
              <div key={id} className="adm-pag-row">
                <div className="adm-pag-jogador">
                  {j.fotoUrl
                    ? <img src={j.fotoUrl} alt={j.nome} className="adm-pag-foto" />
                    : <span className="adm-pres-avatar">👤</span>
                  }
                  <div><p className="adm-pag-nome">{j.nome}</p><p className="adm-pag-pos">{j.posicao || "—"}</p></div>
                </div>
                <span className="adm-pag-badge pendente">❌ Pendente</span>
                <button
                  className="adm-pag-btn confirmar"
                  disabled={atualizando[id]}
                  onClick={() => toggle(j)}
                >
                  {atualizando[id] ? "..." : "Confirmar"}
                </button>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── USUÁRIOS ────────────────────────────────────────────────────────────────
function AbaUsuarios({ usuarios }) {
  return (
    <div>
      <h2 className="adm-section-title">👥 Usuários Cadastrados</h2>
      <div className="adm-pag-tabela">
        <div className="adm-pag-thead"><span>Nome</span><span>Email</span><span>Admin</span></div>
        {usuarios.map((u) => (
          <div key={u.id_usuarios} className="adm-pag-row">
            <p className="adm-pag-nome">{u.nome}</p>
            <p className="adm-pag-pos">{u.email}</p>
            <span className={`adm-pag-badge ${u.admin ? "pago" : "pendente"}`}>
              {u.admin ? "✅ Admin" : "👤 Usuário"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}