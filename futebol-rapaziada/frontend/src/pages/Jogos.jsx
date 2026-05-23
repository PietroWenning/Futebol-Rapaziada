import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import "../style/Jogos.css";

// ─── Evento individual (gol, cartão) ─────────────────────────────────────────
function EventoJogo({ evento, lado }) {
  const esquerda = lado === "A";
  const icones = {
    gol: "⚽",
    cartao_amarelo: "🟨",
    cartao_vermelho: "🟥",
  };
  const classesIcone = {
    gol: "evento-item__icone--gol",
    cartao_amarelo: "evento-item__icone--amarelo",
    cartao_vermelho: "evento-item__icone--vermelho",
  };

  return (
    <div className={`evento-item ${!esquerda ? "evento-item--direita" : ""}`}>
      <span className="evento-item__minuto">{evento.minuto}'</span>
      <div className={`evento-item__icone ${classesIcone[evento.tipo] || classesIcone.gol}`}>
        {icones[evento.tipo] || "⚽"}
      </div>
      <div className="evento-item__info">
        <div className="evento-item__nome">{evento.jogador}</div>
        {evento.tipo === "gol" && (
          <div className="evento-item__sub">Time {evento.time}</div>
        )}
      </div>
    </div>
  );
}

// ─── Tela de detalhe (estilo app de futebol) ──────────────────────────────────
function DetalheJogo({ jogo, onVoltar }) {
  const [aba, setAba] = useState("visao");

  const formatarData = (d) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const eventos = jogo.eventos || [];
  const gols = eventos.filter((e) => e.tipo === "gol");
  const vencedorA = jogo.placar_time_a > jogo.placar_time_b;
  const vencedorB = jogo.placar_time_b > jogo.placar_time_a;

  return (
    <div className="detalhe-wrap">
      {/* Header com placar */}
      <div className="detalhe-header">
        <button className="btn-back" onClick={onVoltar}>←</button>

        <div className="detalhe-placar-wrap">
          <div className="detalhe-status">
            {jogo.status === "finalizado" ? "Fim de jogo" : "Ao Vivo"}
          </div>
          <div className="detalhe-placar">
            <span className={vencedorA ? "detalhe-placar__gols--vencedor" : ""}>
              {jogo.placar_time_a}
            </span>
            <span className="detalhe-placar__sep"> – </span>
            <span className={vencedorB ? "detalhe-placar__gols--vencedor" : ""}>
              {jogo.placar_time_b}
            </span>
          </div>
          <div className="detalhe-data">{formatarData(jogo.data_jogo)}</div>
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* Escudos */}
      <div className="detalhe-times">
        <div className="detalhe-time">
          <div className="detalhe-time__escudo">🟡</div>
          <div className="detalhe-time__nome">Time A</div>
        </div>
        <div className="detalhe-time">
          <div className="detalhe-time__escudo">🔵</div>
          <div className="detalhe-time__nome">Time B</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detalhe-tabs">
        {[["visao", "Visão geral"], ["gols", "Artilheiros"]].map(([k, label]) => (
          <button
            key={k}
            className={`detalhe-tab ${aba === k ? "detalhe-tab--ativo" : ""}`}
            onClick={() => setAba(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="eventos-wrap">
        {aba === "visao" && (
          <>
            <div className="eventos-titulo">Principais eventos</div>
            <div className="eventos-separador">
              <div className="eventos-separador__linha" />
              <span>Fim de jogo {jogo.placar_time_a}-{jogo.placar_time_b}</span>
              <div className="eventos-separador__linha" />
            </div>

            {eventos.length === 0 && (
              <div style={{ color: "#888", textAlign: "center", padding: "32px 0", fontSize: 14 }}>
                Nenhum evento registrado
              </div>
            )}

            {[...eventos]
              .sort((a, b) => b.minuto - a.minuto)
              .map((ev, i) => (
                <EventoJogo key={i} evento={ev} lado={ev.time} />
              ))}
          </>
        )}

        {aba === "gols" && (
          <>
            <div className="eventos-titulo">Artilheiros</div>
            {["A", "B"].map((time) => {
              const golsTime = gols.filter((g) => g.time === time);
              return (
                <div key={time} className="artilheiros-secao">
                  <div className="artilheiros-secao__titulo">Time {time}</div>
                  {golsTime.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Nenhum gol</div>
                  ) : (
                    golsTime.map((g, i) => (
                      <div key={i} className="artilheiro-item">
                        <div className="evento-item__icone evento-item__icone--gol">⚽</div>
                        <div>
                          <div className="artilheiro-item__nome">{g.jogador}</div>
                          <div className="artilheiro-item__min">{g.minuto}'</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal: criar jogo ────────────────────────────────────────────────────────
function ModalCriarJogo({ onFechar, onSalvar }) {
  const hoje = new Date().toISOString().split("T")[0];
  const [data, setData] = useState(hoje);
  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);
  const [artilheiros, setArtilheiros] = useState([
    { jogador: "", minuto: "", time: "A" },
  ]);
  const [salvando, setSalvando] = useState(false);

  const addArtilheiro = () =>
    setArtilheiros([...artilheiros, { jogador: "", minuto: "", time: "A" }]);

  const removeArtilheiro = (i) =>
    setArtilheiros(artilheiros.filter((_, idx) => idx !== i));

  const updateArt = (i, campo, valor) => {
    const copia = [...artilheiros];
    copia[i][campo] = valor;
    setArtilheiros(copia);
  };

  const handleSalvar = async () => {
    if (!data) return;
    setSalvando(true);

    const golsValidos = artilheiros.filter((a) => a.jogador.trim());
    const placarA = parseInt(golsA, 10) || 0;
    const placarB = parseInt(golsB, 10) || 0;

    const payload = {
      data_jogo: data,
      placar_time_a: placarA,
      placar_time_b: placarB,
      vencedor:
        placarA > placarB ? "Time A" : placarB > placarA ? "Time B" : null,
      status: "finalizado",
      eventos: golsValidos.map((a) => ({
        tipo: "gol",
        jogador: a.jogador.trim(),
        minuto: parseInt(a.minuto, 10) || 0,
        time: a.time,
      })),
    };

    try {
      const res = await fetch("/jogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const novo = await res.json();
      onSalvar(novo);
    } catch (err) {
      alert("Erro: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal-sheet">
        <div className="modal-titulo">⚽ Registrar Jogo</div>

        <label className="modal-label">Data do jogo</label>
        <input
          type="date"
          className="modal-input"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />

        {/* Placar */}
        <label className="modal-label">Placar</label>
        <div className="placar-inputs">
          <div className="placar-time">
            <div className="placar-time__label">Time A</div>
            <input
              type="number"
              min={0}
              className="placar-time__input"
              value={golsA}
              onChange={(e) => setGolsA(e.target.value)}
            />
          </div>
          <span className="placar-vs">×</span>
          <div className="placar-time">
            <div className="placar-time__label">Time B</div>
            <input
              type="number"
              min={0}
              className="placar-time__input"
              value={golsB}
              onChange={(e) => setGolsB(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-divider" />

        {/* Artilheiros */}
        <div className="modal-secao">🥅 Quem fez os gols?</div>
        {artilheiros.map((art, i) => (
          <div key={i} className="artilheiro-row">
            <input
              className="artilheiro-row__input"
              placeholder="Nome do jogador"
              value={art.jogador}
              onChange={(e) => updateArt(i, "jogador", e.target.value)}
            />
            <input
              type="number"
              className="artilheiro-row__input artilheiro-row__min"
              placeholder="Min"
              value={art.minuto}
              onChange={(e) => updateArt(i, "minuto", e.target.value)}
            />
            <select
              className="artilheiro-row__select"
              value={art.time}
              onChange={(e) => updateArt(i, "time", e.target.value)}
            >
              <option value="A">Time A</option>
              <option value="B">Time B</option>
            </select>
            <button className="btn-remove" onClick={() => removeArtilheiro(i)}>×</button>
          </div>
        ))}

        <button className="btn-add-artilheiro" onClick={addArtilheiro}>
          + Adicionar artilheiro
        </button>

        <button className="btn-salvar" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Jogo"}
        </button>
        <button className="btn-cancelar" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Jogos() {
  const navigate = useNavigate();
  const usuarioLogado = JSON.parse(localStorage.getItem("user"));

  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [jogoAberto, setJogoAberto] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    if (!usuarioLogado) navigate("/login");
  }, []);

  useEffect(() => {
    fetch("/jogos")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar jogos");
        return res.json();
      })
      .then((data) => {
        const finalizados = data
          .filter((j) => j.status === "finalizado" || j.placar_time_a != null)
          .sort((a, b) => new Date(b.data_jogo) - new Date(a.data_jogo));
        setJogos(finalizados);
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message);
        setLoading(false);
      });
  }, []);

  const formatarData = (dataStr) =>
    new Date(dataStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleNovoJogo = (novo) => {
    setJogos((prev) => [novo, ...prev]);
    setModalAberto(false);
  };

  if (jogoAberto) {
    return <DetalheJogo jogo={jogoAberto} onVoltar={() => setJogoAberto(null)} />;
  }

  return (
    <Layout>
      <div className="jogos-wrap">
        {/* Header */}
        <div className="jogos-header">
          <div className="jogos-header__info">
            <h1 className="page-titulo">Jogos</h1>
            <p className="page-sub">Temporada 2026 · {jogos.length} registrados</p>
          </div>
          <button className="btn-novo-jogo" onClick={() => setModalAberto(true)}>
            + Novo jogo
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="jogos-empty">
            <span className="je-icone">⏳</span>
            <h2>Carregando jogos...</h2>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="jogos-empty">
            <span className="je-icone">⚠️</span>
            <h2>Erro ao carregar</h2>
            <p>{erro}</p>
          </div>
        )}

        {/* Vazio */}
        {!loading && !erro && jogos.length === 0 && (
          <div className="jogos-empty">
            <span className="je-icone">⚽</span>
            <h2>Nenhum jogo ainda</h2>
            <p>Registre o primeiro jogo da temporada!</p>
            <button className="btn-novo-jogo" onClick={() => setModalAberto(true)}>
              + Registrar jogo
            </button>
          </div>
        )}

        {/* Lista */}
        {!loading && !erro && jogos.length > 0 && (
          <div className="jogos-lista">
            {jogos.map((j) => {
              const vA = j.placar_time_a > j.placar_time_b;
              const vB = j.placar_time_b > j.placar_time_a;
              const empate = j.placar_time_a === j.placar_time_b;
              const golsA = (j.eventos || []).filter((e) => e.tipo === "gol" && e.time === "A");
              const golsB = (j.eventos || []).filter((e) => e.tipo === "gol" && e.time === "B");

              return (
                <div key={j.id_jogo} className="jogo-card" onClick={() => setJogoAberto(j)}>
                  <div className="jogo-card__data">
                    <span>⚽ {formatarData(j.data_jogo)}</span>
                    <span className={`jogo-card__status ${j.status !== "finalizado" ? "jogo-card__status--live" : ""}`}>
                      {j.status === "finalizado" ? "Encerrado" : "Ao Vivo"}
                    </span>
                  </div>

                  <div className="jogo-card__placar">
                    <div className="jogo-card__time">
                      <div className="jogo-card__time-nome">Time A</div>
                      <div className={`jogo-card__gols ${vA ? "jogo-card__gols--vencedor" : ""}`}>
                        {j.placar_time_a}
                      </div>
                      {golsA.length > 0 && (
                        <div className="jogo-card__artilheiros">
                          {golsA.map((g) => g.jogador).join(", ")}
                        </div>
                      )}
                    </div>

                    <span className="jogo-card__vs">×</span>

                    <div className="jogo-card__time jogo-card__time--direita">
                      <div className="jogo-card__time-nome">Time B</div>
                      <div className={`jogo-card__gols ${vB ? "jogo-card__gols--vencedor" : ""}`}>
                        {j.placar_time_b}
                      </div>
                      {golsB.length > 0 && (
                        <div className="jogo-card__artilheiros">
                          {golsB.map((g) => g.jogador).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="jogo-card__rodape">
                    {empate ? (
                      <span className="jogo-card__badge jogo-card__badge--empate">🤝 Empate</span>
                    ) : (
                      <span className="jogo-card__badge jogo-card__badge--vitoria">
                        🏆 {vA ? "Time A" : "Time B"} venceu
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {modalAberto && (
          <ModalCriarJogo
            onFechar={() => setModalAberto(false)}
            onSalvar={handleNovoJogo}
          />
        )}
      </div>
    </Layout>
  );
}