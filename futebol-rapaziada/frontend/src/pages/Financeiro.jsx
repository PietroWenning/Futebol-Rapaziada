import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import { getJogadores, obterToken, getUsuarioAtual } from "../services/api";
import "../style/financeiro.css";

const API_URL = import.meta.env.VITE_API_URL ?? "https://futebol-rapaziada-production.up.railway.app";

export default function Financeiro() {
  const [jogadores, setJogadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [usuarioAtual] = useState(() => getUsuarioAtual());

  const [valores, setValores] = useState({ titular: 16.70, reserva: 8.35});
  const [valoresTemp, setValoresTemp] = useState({ titular: 16.70, reserva: 8.35});
  const [editandoValores, setEditandoValores] = useState(false);
  const [salvandoValores, setSalvandoValores] = useState(false);

  const CHAVE_PIX = "577-704-458-17";
  const isAdmin = usuarioAtual?.isAdmin === true || usuarioAtual?.admin === true || usuarioAtual?.admin === 1;

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
      const dados = await getJogadores();
      setJogadores(dados);
    } catch (e) {
      console.error("Erro ao carregar financeiro:", e);
    } finally {
      setLoading(false);
    }
  }

  const podeAlterarPagamento = (jogador) => {
    if (!usuarioAtual) return false;
    return isAdmin || jogador.nome?.toLowerCase() === usuarioAtual?.nome?.toLowerCase();
  };

  const isEu = (jogador) =>
    jogador.nome?.toLowerCase() === usuarioAtual?.nome?.toLowerCase();

  const handleCopiar = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  async function togglePagamento(jogador) {
    setProcessando(jogador.id_jogador);
    try {
      const token = obterToken();
      const novoStatus = !jogador.pagou;
      const response = await fetch(`${API_URL}/jogadores/${jogador.id_jogador}/pagamento`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pagou: novoStatus }),
      });
      if (response.ok) {
        setJogadores(lista =>
          lista.map(j => j.id_jogador === jogador.id_jogador ? { ...j, pagou: novoStatus } : j)
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessando(null);
    }
  }

  async function salvarValores() {
    setSalvandoValores(true);
    try {
      const token = obterToken();
      const response = await fetch(`${API_URL}/configuracoes/valores`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          valor_titular: parseFloat(valoresTemp.titular),
          valor_reserva: parseFloat(valoresTemp.reserva),
        }),
      });
      if (response.ok) {
        setValores({ ...valoresTemp });
        setEditandoValores(false);
      } else {
        alert("Erro ao salvar valores.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    } finally {
      setSalvandoValores(false);
    }
  }

  const pagos     = jogadores.filter(j => j.pagou);
  const pendentes = jogadores.filter(j => !j.pagou);
  const totalArrecadado = pagos.reduce(
    (acc, j) => acc + (j.isReserva ? valores.reserva : valores.titular), 0
  );

  const euJogador = jogadores.find(j => isEu(j));

  if (loading) return (
    <Layout><div className="loading-screen"><div className="loading-ball">💰</div></div></Layout>
  );

  return (
    <Layout>
      <div className="fin-wrap">
        <h1 className="page-titulo">Financeiro</h1>
        <p className="page-sub">Controle de pagamentos — Temporada 2026</p>

        {/* ── MEU STATUS ── */}
        {euJogador && (
          <div className={`fin-meu-status ${euJogador.pagou ? "fms-pago" : "fms-pendente"}`}>
            <div className="fms-info">
              <span className="fms-icon">{euJogador.pagou ? "✅" : "⏳"}</span>
              <div>
                <p className="fms-titulo">Seu pagamento</p>
                <p className="fms-sub">
                  {euJogador.pagou
                    ? "Pagamento confirmado!"
                    : `Pendente — R$ ${Number(euJogador.isReserva ? valores.reserva : valores.titular).toFixed(2)}`}
                </p>
              </div>
            </div>
            {podeAlterarPagamento(euJogador) && (
              <button
                className={`btn-fin-acao ${euJogador.pagou ? "btn-reverter" : "btn-pagar"}`}
                onClick={() => togglePagamento(euJogador)}
                disabled={processando === euJogador.id_jogador}
              >
                {processando === euJogador.id_jogador
                  ? "..."
                  : euJogador.pagou ? "↩ Reverter" : "✅ Confirmar pagamento"}
              </button>
            )}
          </div>
        )}

        {/* ── CONTADORES ── */}
        <div className="fin-contadores">
          <div className="fin-cnt fin-cnt-pago">
            <span className="fin-cnt-num">{pagos.length}</span>
            <span className="fin-cnt-lbl">Pagos</span>
          </div>
          <div className="fin-cnt fin-cnt-pendente">
            <span className="fin-cnt-num">{pendentes.length}</span>
            <span className="fin-cnt-lbl">Pendentes</span>
          </div>
          <div className="fin-cnt fin-cnt-arrecadado">
            <span className="fin-cnt-num fin-cnt-num-rs">R$ {totalArrecadado.toFixed(2)}</span>
            <span className="fin-cnt-lbl">Arrecadado</span>
          </div>
        </div>

        {/* ── CARD PIX ── */}
        <div className="fin-pix-card">
          <div className="fin-pix-left">
            <span className="fin-pix-label">🔑 Chave PIX</span>
            <span className="fin-pix-chave">{CHAVE_PIX}</span>
            <div className="fin-pix-valores">
              {!editandoValores ? (
                <>
                  <span className="fin-val-tag">Titular: <b>R$ {Number(valores.titular).toFixed(2)}</b></span>
                  <span className="fin-val-tag">Reserva: <b>R$ {Number(valores.reserva).toFixed(2)}</b></span>
                  {isAdmin && (
                    <button className="btn-editar-valores" onClick={() => { setValoresTemp({...valores}); setEditandoValores(true); }}>
                      ✏️ Editar valores
                    </button>
                  )}
                </>
              ) : (
                <div className="form-editar-valores">
                  <label>Titular (R$)
                    <input type="number" step="0.01" min="0" value={valoresTemp.titular}
                      onChange={e => setValoresTemp(v => ({ ...v, titular: e.target.value }))} />
                  </label>
                  <label>Reserva (R$)
                    <input type="number" step="0.01" min="0" value={valoresTemp.reserva}
                      onChange={e => setValoresTemp(v => ({ ...v, reserva: e.target.value }))} />
                  </label>
                  <div className="form-editar-acoes">
                    <button className="btn-salvar-valores" onClick={salvarValores} disabled={salvandoValores}>
                      {salvandoValores ? "Salvando..." : "✅ Salvar"}
                    </button>
                    <button className="btn-cancelar-valores" onClick={() => { setValoresTemp({...valores}); setEditandoValores(false); }} disabled={salvandoValores}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button className={`btn-copiar-pix ${copiado ? "sucesso" : ""}`} onClick={handleCopiar}>
            {copiado ? "✅ Copiado!" : "📋 Copiar Chave"}
          </button>
        </div>

        {/* ── PAGOS ── */}
        <section className="fin-section">
          <h2 className="fin-section-titulo">✅ Pagos ({pagos.length})</h2>
          <div className="fin-lista">
            {pagos.length === 0
              ? <p className="fin-vazio">Nenhum pagamento confirmado ainda.</p>
              : pagos.map(j => (
                <div key={j.id_jogador} className={`fin-item fin-item-pago ${isEu(j) ? "fin-eu" : ""}`}>
                  <div className="fin-avatar">{j.nome?.[0]}</div>
                  <div className="fin-info">
                    <span className="fin-nome">
                      {j.nome?.split(" ")[0]}
                      {isEu(j) && <span className="tag-eu">você</span>}
                    </span>
                    <span className="fin-pos">{j.posicao || "—"}</span>
                  </div>
                  <div className="fin-item-acoes">
                    <span className={`fin-tipo-badge ${j.isReserva ? "res" : "tit"}`}>
                      {j.isReserva ? "RESERVA" : "TITULAR"}
                    </span>
                    <span className="fin-status-badge pago">✅ Pago</span>
                    <span className="fin-valor">R$ {Number(j.isReserva ? valores.reserva : valores.titular).toFixed(2)}</span>
                    {podeAlterarPagamento(j) && (
                      <button className="btn-mini btn-mini-reverter" onClick={() => togglePagamento(j)} disabled={processando === j.id_jogador}>
                        {processando === j.id_jogador ? "..." : "Reverter"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </section>

        {/* ── PENDENTES ── */}
        <section className="fin-section">
          <h2 className="fin-section-titulo">⏳ Pendentes ({pendentes.length})</h2>
          <div className="fin-lista">
            {pendentes.length === 0
              ? <p className="fin-vazio">🎉 Todos pagaram!</p>
              : pendentes.map(j => (
                <div key={j.id_jogador} className={`fin-item fin-item-pendente ${isEu(j) ? "fin-eu" : ""}`}>
                  <div className="fin-avatar">{j.nome?.[0]}</div>
                  <div className="fin-info">
                    <span className="fin-nome">
                      {j.nome?.split(" ")[0]}
                      {isEu(j) && <span className="tag-eu">você</span>}
                    </span>
                    <span className="fin-pos">{j.posicao || "—"}</span>
                  </div>
                  <div className="fin-item-acoes">
                    <span className={`fin-tipo-badge ${j.isReserva ? "res" : "tit"}`}>
                      {j.isReserva ? "RESERVA" : "TITULAR"}
                    </span>
                    <span className="fin-status-badge pendente">⏳ Pendente</span>
                    <span className="fin-valor">R$ {Number(j.isReserva ? valores.reserva : valores.titular).toFixed(2)}</span>
                    {podeAlterarPagamento(j) && (
                      <button className="btn-mini btn-mini-pagar" onClick={() => togglePagamento(j)} disabled={processando === j.id_jogador}>
                        {processando === j.id_jogador ? "..." : "Confirmar"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </section>
      </div>
    </Layout>
  );
}