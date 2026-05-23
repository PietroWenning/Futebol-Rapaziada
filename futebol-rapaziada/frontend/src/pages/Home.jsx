import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJogadores, deletarJogador, getMe } from "../services/api";
import Layout from "../components/layout/Layout";
import CartaFifa from "../components/CartaFifa";
import { getTipo, TIER_INFO } from "../utils/playerTier";
import "../style/Home.css";

const POSICOES = ["Goleiro","Zagueiro","Lateral Direito","Lateral Esquerdo","Meia","Centroavante"];

const obterDadosProximoJogo = () => {
  const ref = new Date(2025, 4, 1, 23, 0, 0);
  while (ref.getDay() !== 5) ref.setDate(ref.getDate() + 1);
  const hoje = new Date();
  let dataJogo = new Date(ref);
  let i = 0;
  while (dataJogo < hoje) {
    i++;
    dataJogo = new Date(ref);
    dataJogo.setDate(ref.getDate() + i * 14);
  }
  const diff = dataJogo - hoje;
  const dias = Math.ceil(diff / 86400000);
  return {
    contagem: dias === 0 ? "HOJE" : `Em ${dias} dias`,
    data: dataJogo.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
  };
};

export default function Home() {
  const proximoJogo   = obterDadosProximoJogo();
  const navigate      = useNavigate();
  const usuarioLogado = JSON.parse(localStorage.getItem("user"));

  const [player,   setPlayer]  = useState(null);
  const [todos,    setTodos]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [painel,   setPainel]  = useState(false);
  const [salvando, setSalv]    = useState(false);
  const [msg,      setMsg]     = useState({ tipo: "", texto: "" });
  const [form,     setForm]    = useState({
    nome: "", posicao: "", idade: "", perna_boa: "Direita",
    fotoUrl: "", gols: 0, assistencias: 0, jogos: 0, cartoes: 0,
    vitorias: 0, empates: 0, derrotas: 0, desarmes: 0, defesas: 0,
  });

  useEffect(() => {
    if (!usuarioLogado) { navigate("/login"); return; }
    carregar();
  }, []);

  async function carregar() {
    try {
      const meu = await getMe();
      setPlayer(meu);
      preencherForm(meu);
      const todosJog = await getJogadores();
      setTodos(todosJog);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function preencherForm(j) {
    setForm({
      nome: j.nome ?? "", posicao: j.posicao ?? "", idade: j.idade ?? "",
      perna_boa: j.perna_boa ?? "Direita", fotoUrl: j.fotoUrl ?? "",
      gols: j.gols ?? 0, assistencias: j.assistencias ?? 0,
      jogos: j.jogos ?? 0, cartoes: j.cartoes ?? 0,
      vitorias: j.vitorias ?? 0, empates: j.empates ?? 0,
      derrotas: j.derrotas ?? 0, desarmes: j.desarmes ?? 0,
      defesas: j.defesas ?? 0,
    });
  }

  const set = campo => e => setForm(o => ({ ...o, [campo]: e.target.value }));

  async function salvar() {
    if (!player) return;
    setSalv(true); setMsg({ tipo: "", texto: "" });
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL ?? "https://futebol-rapaziada-lfqr.onrender.com";
      const res = await fetch(`${API_URL}/jogadores/${player.id_jogador ?? player.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          idade:        Number(form.idade),
          gols:         Number(form.gols),
          assistencias: Number(form.assistencias),
          jogos:        Number(form.jogos),
          cartoes:      Number(form.cartoes),
          vitorias:     Number(form.vitorias),
          empates:      Number(form.empates),
          derrotas:     Number(form.derrotas),
          desarmes:     Number(form.desarmes),
          defesas:      Number(form.defesas),
        }),
      });
      if (!res.ok) throw new Error();
      setMsg({ tipo: "ok", texto: "Perfil atualizado!" });
      await carregar();
      setTimeout(() => { setMsg({ tipo: "", texto: "" }); setPainel(false); }, 1500);
    } catch { setMsg({ tipo: "err", texto: "Erro ao salvar." }); }
    finally { setSalv(false); }
  }

  if (loading) return <Layout><div className="loading-screen"><div className="loading-ball">⚽</div></div></Layout>;
  if (!player) return <Layout><div className="loading-screen"><p>Nenhum perfil encontrado.</p></div></Layout>;

  const tipo = getTipo(player, todos);
  const tier = TIER_INFO[tipo];

  return (
    <Layout>
      <div className="home-wrap">
        <div className="home-row">

          {/* CARTA */}
          <CartaFifa jogador={player} todos={todos} showBadge={true} />

          {/* INFO */}
          <div className="home-info">
            <div className="info-topo">
              <h1 className="info-nome">{player.nome}</h1>
              <div className="info-tags">
                <span className="tag neon-tag">{player.posicao || "—"}</span>
                <span className="tag">🦵 {player.perna_boa || "—"}</span>
                <span className="tag">🎂 {player.idade || "—"} anos</span>
                <span className={`tag tier-tag-${tipo}`}>{tier.badge}</span>
              </div>
            </div>

            {/* Quick Stats — linha 1 */}
            <div className="quick-grid">
              {[
                { i:"⚽", v:player.gols??0,        l:"Gols"    },
                { i:"🎯", v:player.assistencias??0, l:"Assist." },
                { i:"🏟", v:player.jogos??0,        l:"Jogos"   },
                { i:"🟨", v:player.cartoes??0,      l:"Cartões" },
                { i:"🔥", v:(player.gols??0)+(player.assistencias??0), l:"G+A" },
                { i:"⭐", v:player.overall??0,      l:"Overall" },
              ].map(({i,v,l}) => (
                <div key={l} className="qs-card">
                  <span className="qs-i">{i}</span>
                  <span className="qs-v">{v}</span>
                  <span className="qs-l">{l}</span>
                </div>
              ))}
            </div>

            {/* Quick Stats — linha 2 */}
            <div className="quick-grid">
              {[
                { i:"🏆", v:player.vitorias??0, l:"Vitórias", c:"qs-card qs-vit" },
                { i:"🤝", v:player.empates??0,  l:"Empates",  c:"qs-card qs-emp" },
                { i:"💔", v:player.derrotas??0, l:"Derrotas", c:"qs-card qs-der" },
                { i:"🛡️", v:player.desarmes??0, l:"Desarmes", c:"qs-card qs-dsm" },
                { i:"🧤", v:player.defesas??0,  l:"Defesas",  c:"qs-card qs-def" },
                { i:"📊", v:(() => {
                    const pts =
                      (player.gols??0)*3 + (player.assistencias??0)*2 +
                      (player.defesas??0)*2 + (player.desarmes??0)*2 +
                      (player.vitorias??0)*3 + (player.empates??0)*1 +
                      (player.cartoes??0)*(-1) + (player.cartoes_vermelhos??0)*(-3);
                    return pts;
                  })(), l:"Pts Camp.", c:"qs-card qs-pts" },
              ].map(({i,v,l,c}) => (
                <div key={l} className={c ?? "qs-card"}>
                  <span className="qs-i">{i}</span>
                  <span className="qs-v">{v}</span>
                  <span className="qs-l">{l}</span>
                </div>
              ))}
            </div>

            <div className="home-btns">
              <button className="btn-neon" onClick={() => setPainel(true)}>✏️ Editar Perfil</button>
            </div>
          </div>
        </div>

        {/* CARDS INFO */}
        <div className="info-grid">
          <div className={`info-card ${player.confirmado ? "ic-green" : "ic-red"}`}>
            <div className="ic-header"><span>{player.confirmado ? "✅" : "❌"}</span><h3>Próximo Jogo</h3></div>
            <div className="ic-body"><p className="ic-val">{player.confirmado ? "Confirmado" : "Não confirmado"}</p></div>
          </div>
          <div className="info-card" onClick={() => navigate("/calendario")}>
            <div className="ic-header"><span>📅</span><p className="ci-label">Próxima Partida</p></div>
            <div className="ic-body"><h3 className="ic-val">{proximoJogo.contagem}</h3><p className="ic-sub">{proximoJogo.data}</p></div>
          </div>
          <div className="info-card" onClick={() => navigate("/calendario")}>
            <div className="ic-header"><span>🗓️</span><p className="ci-label">Calendário</p></div>
            <div className="ic-body"><h3 className="ic-val">Jogos</h3><p className="ic-sub">Ver todas as datas</p></div>
          </div>
          <div className="info-card">
            <div className="ic-header"><span>🏆</span><h3>Campeonato</h3></div>
            <div className="ic-body"><p className="ic-val">Temporada 2026</p><p className="ic-sub">Modo Carreira</p></div>
          </div>
          <div className="info-card">
            <div className="ic-header"><span>⚔️</span><h3>Resultados</h3></div>
            <div className="ic-body">
              {[
                { l:"Vitórias", v: player.vitorias ?? 0 },
                { l:"Empates",  v: player.empates  ?? 0 },
                { l:"Derrotas", v: player.derrotas ?? 0 },
              ].map(({l,v}) => (
                <div key={l} className="desemp-row">
                  <span className="d-lbl">{l}</span>
                  <span className="d-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="info-card">
            <div className="ic-header"><span>📈</span><h3>Desempenho</h3></div>
            <div className="ic-body">
              {[
                { l:"Média Gols", v: player.jogos>0?(player.gols/player.jogos).toFixed(2):"0.00" },
                { l:"Média Ass.", v: player.jogos>0?(player.assistencias/player.jogos).toFixed(2):"0.00" },
                { l:"G+A / Jogo", v: player.jogos>0?(((player.gols??0)+(player.assistencias??0))/player.jogos).toFixed(2):"0.00" },
              ].map(({l,v}) => (
                <div key={l} className="desemp-row">
                  <span className="d-lbl">{l}</span>
                  <span className="d-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE EDIÇÃO */}
      {painel && (
        <div className="overlay" onClick={() => setPainel(false)}>
          <div className="painel" onClick={e => e.stopPropagation()}>
            <div className="p-header">
              <h2>Editar Perfil</h2>
              <button className="p-close" onClick={() => setPainel(false)}>✕</button>
            </div>

            <div className="p-section">
              <p className="p-label">Dados</p>
              <label className="p-fl">Nome</label>
              <input className="p-input" value={form.nome} onChange={set("nome")}/>
              <label className="p-fl">Posição</label>
              <select className="p-input" value={form.posicao} onChange={set("posicao")}>
                {POSICOES.map(p => <option key={p}>{p}</option>)}
              </select>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Idade</label>
                  <input className="p-input" type="number" min="5" max="99" value={form.idade} onChange={set("idade")}/>
                </div>
                <div className="p-col">
                  <label className="p-fl">Perna boa</label>
                  <select className="p-input" value={form.perna_boa} onChange={set("perna_boa")}>
                    <option>Direita</option><option>Esquerda</option><option>Ambas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-section">
              <p className="p-label">⚽ Ataque</p>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Gols</label>
                  <input className="p-input" type="number" min="0" value={form.gols} onChange={set("gols")}/>
                </div>
                <div className="p-col">
                  <label className="p-fl">Assistências</label>
                  <input className="p-input" type="number" min="0" value={form.assistencias} onChange={set("assistencias")}/>
                </div>
              </div>
            </div>

            <div className="p-section">
              <p className="p-label">🏆 Resultados</p>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Vitórias</label>
                  <input className="p-input" type="number" min="0" value={form.vitorias} onChange={set("vitorias")}/>
                </div>
                <div className="p-col">
                  <label className="p-fl">Empates</label>
                  <input className="p-input" type="number" min="0" value={form.empates} onChange={set("empates")}/>
                </div>
              </div>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Derrotas</label>
                  <input className="p-input" type="number" min="0" value={form.derrotas} onChange={set("derrotas")}/>
                </div>
                <div className="p-col">
                  <label className="p-fl">Jogos</label>
                  <input className="p-input" type="number" min="0" value={form.jogos} onChange={set("jogos")}/>
                </div>
              </div>
            </div>

            <div className="p-section">
              <p className="p-label">🛡️ Defesa</p>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Desarmes</label>
                  <input className="p-input" type="number" min="0" value={form.desarmes} onChange={set("desarmes")}/>
                </div>
                <div className="p-col">
                  <label className="p-fl">Defesas (Goleiro)</label>
                  <input className="p-input" type="number" min="0" value={form.defesas} onChange={set("defesas")}/>
                </div>
              </div>
            </div>

            <div className="p-section">
              <p className="p-label">🟨 Disciplina</p>
              <div className="p-row">
                <div className="p-col">
                  <label className="p-fl">Cartões Amarelos</label>
                  <input className="p-input" type="number" min="0" value={form.cartoes} onChange={set("cartoes")}/>
                </div>
              </div>
            </div>

            {msg.texto && <div className={`msg ${msg.tipo==="ok"?"msg-ok":"msg-err"}`}>{msg.texto}</div>}
            <button className="btn-salvar" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}