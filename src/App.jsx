import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from "recharts";
import { UserPlus, Wallet, TrendingUp, ShoppingBag, Megaphone, PiggyBank, Zap, Percent, LayoutGrid, Facebook, Menu as MenuIcon, SlidersHorizontal, X } from "lucide-react";

const BRL = (n) => "BRL " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const C = {
  bg: "#0B0813",
  card: "#15101F",
  cardBorder: "#241B33",
  txt: "#F2EEF8",
  mut: "#8B8398",
  roxo: "#8B5CF6",
  roxoClaro: "#A78BFA",
  azul: "#3B82F6",
  verde: "#10B981",
  vermelho: "#EF4444",
  laranja: "#F97316",
  rosa: "#D946EF",
  roxoEsc: "#4C2889",
};

const API_URL = "https://script.google.com/macros/s/AKfycbzTwte_tqaV3VW8Kad1mlh24-ECYDYQVEenTPBmAFYiuWz2Cxsrde-2mWLmLYXCInXA/exec";
const POLL_MS = 15000;

async function lerSheets() {
  if (!API_URL) return null;
  const resp = await fetch(API_URL);
  const dados = await resp.json();
  return dados.map((r) => ({ ...r, id: r.data }));
}

async function salvarSheets(registro) {
  if (!API_URL) return;
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ acao: "salvar", registro }) });
}

async function removerSheets(data) {
  if (!API_URL) return;
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ acao: "remover", data }) });
}

const dataLocal = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState("vendas");
  const [tela, setTela] = useState("resumo");
  const [periodo, setPeriodo] = useState("ontem");
  const [modal, setModal] = useState(false);
  const [filtroModal, setFiltroModal] = useState(false);
  const [intervalo, setIntervalo] = useState({ de: "", ate: "" });
  const [form, setForm] = useState({ data: dataLocal(), gasto: "", faturamento: "", leads: "", vendas: "" });
  const [sync, setSync] = useState("local");

  const carregar = async () => {
    if (API_URL) {
      try {
        const remoto = await lerSheets();
        if (remoto) {
          setRegistros(remoto);
          setSync("online");
          try { await window.storage.set("leona:registros", JSON.stringify(remoto)); } catch (e) {}
          return;
        }
      } catch (e) { setSync("erro"); }
    }
    try {
      const r = await window.storage.get("leona:registros");
      if (r && r.value) setRegistros(JSON.parse(r.value));
    } catch (e) {}
  };

  useEffect(() => {
    (async () => { await carregar(); setCarregando(false); })();
    if (API_URL) {
      const t = setInterval(carregar, POLL_MS);
      return () => clearInterval(t);
    }
  }, []);

  const salvar = async (lista) => {
    setRegistros(lista);
    try { await window.storage.set("leona:registros", JSON.stringify(lista)); } catch (e) {}
  };

  const adicionar = () => {
    if (!form.data) return;
    const novo = {
      id: form.data, data: form.data,
      gasto: parseFloat(form.gasto) || 0,
      faturamento: parseFloat(form.faturamento) || 0,
      leads: parseInt(form.leads) || 0,
      vendas: parseInt(form.vendas) || 0,
    };
    const lista = [...registros.filter((x) => x.data !== form.data), novo].sort((a, b) => a.data.localeCompare(b.data));
    salvar(lista);
    salvarSheets(novo).catch(() => {});
    setForm({ data: dataLocal(), gasto: "", faturamento: "", leads: "", vendas: "" });
    setModal(false);
  };

  const remover = (id) => {
    salvar(registros.filter((x) => x.id !== id));
    removerSheets(id).catch(() => {});
  };

  const filtrados = useMemo(() => {
    const hoje = dataLocal();
    const ont = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (periodo === "hoje") return registros.filter((r) => r.data === hoje);
    if (periodo === "ontem") return registros.filter((r) => r.data === ont);
    if (periodo === "custom") {
      const de = intervalo.de || "0000-00-00";
      const ate = intervalo.ate || "9999-99-99";
      return registros.filter((r) => r.data >= de && r.data <= ate);
    }
    return registros.filter((r) => r.data.slice(0, 7) === hoje.slice(0, 7));
  }, [registros, periodo, intervalo]);

  const aplicarIntervalo = () => {
    if (!intervalo.de || !intervalo.ate) return;
    setPeriodo("custom");
    setFiltroModal(false);
  };

  const t = useMemo(() => {
    const gasto = filtrados.reduce((s, r) => s + r.gasto, 0);
    const fat = filtrados.reduce((s, r) => s + r.faturamento, 0);
    const leads = filtrados.reduce((s, r) => s + r.leads, 0);
    const vendas = filtrados.reduce((s, r) => s + r.vendas, 0);
    return {
      gasto, fat, leads, vendas,
      lucro: fat - gasto,
      ticket: vendas > 0 ? fat / vendas : 0,
      roas: gasto > 0 ? fat / gasto : 0,
      conv: leads > 0 ? (vendas / leads) * 100 : 0,
      roi: gasto > 0 ? ((fat - gasto) / gasto) * 100 : 0,
      cpl: leads > 0 ? gasto / leads : 0,
    };
  }, [filtrados]);

  const labelPeriodo = { hoje: "Hoje", ontem: "Ont.", mes: "Mes" };

  const serie = useMemo(() => {
    if (periodo === "mes" || periodo === "custom") {
      return [...filtrados].sort((a, b) => a.data.localeCompare(b.data))
        .map((r) => ({ label: r.data.slice(8, 10) + "/" + r.data.slice(5, 7), v: aba === "vendas" ? r.vendas : r.leads }));
    }
    return [...registros].sort((a, b) => a.data.localeCompare(b.data)).slice(-12)
      .map((r) => ({ label: r.data.slice(8, 10), v: aba === "vendas" ? r.vendas : r.leads }));
  }, [filtrados, registros, periodo, aba]);

  const temDados = serie.some((s) => s.v > 0);

  const inp = { background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 10, color: C.txt, padding: "12px 14px", fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box" };

  if (carregando) return <div style={{ background: C.bg, color: C.mut, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>Carregando...</div>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.txt, fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 440, margin: "0 auto", position: "relative", paddingBottom: 90 }}>
      <div style={{ textAlign: "center", padding: "30px 0 20px" }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, background: `linear-gradient(135deg, ${C.roxoClaro}, ${C.rosa})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", lineHeight: 1 }}>YALLEY</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "5px 14px" }}>
          <span style={{ fontSize: 14 }}>👑</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.mut, letterSpacing: 1, textTransform: "uppercase" }}>Rei do Low Ticket</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.mut, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sync === "online" ? C.verde : sync === "erro" ? C.vermelho : C.mut }} />
          {sync === "online" ? "Sincronizado com Google Sheets" : sync === "erro" ? "Sem conexao com o Sheets (usando local)" : "Modo local"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 18px 18px" }}>
        {[["vendas", "Vendas", ShoppingBag], ["leads", "Leads", UserPlus]].map(([k, lbl, Ic]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: aba === k ? `linear-gradient(135deg, ${C.roxo}, ${C.rosa})` : C.card, color: aba === k ? "#fff" : C.mut,
            border: `1px solid ${aba === k ? "transparent" : C.cardBorder}`, borderRadius: 14,
            padding: "14px 0", fontSize: 16, fontWeight: 600, cursor: "pointer",
            boxShadow: aba === k ? "0 6px 18px rgba(139,92,246,0.35)" : "none", transition: "all .2s",
          }}><Ic size={18} /> {lbl}</button>
        ))}
      </div>

      {tela === "resumo" && (
        <div style={{ padding: "0 18px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ display: "flex", background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, overflow: "hidden" }}>
              {["hoje", "ontem", "mes"].map((p) => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  background: periodo === p ? C.roxoEsc : "transparent", color: periodo === p ? "#fff" : C.mut,
                  border: "none", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>{labelPeriodo[p]}</button>
              ))}
            </div>
            <button onClick={() => setFiltroModal(true)} style={{
              background: periodo === "custom" ? `linear-gradient(135deg, ${C.roxo}, ${C.rosa})` : C.card,
              border: `1px solid ${periodo === "custom" ? "transparent" : C.cardBorder}`, borderRadius: 12, padding: 10, cursor: "pointer", color: C.txt, display: "grid", placeItems: "center",
            }}>
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {periodo === "custom" && intervalo.de && intervalo.ate && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.roxo}`, borderRadius: 20, padding: "5px 12px", fontSize: 12.5, color: C.roxoClaro, fontWeight: 600 }}>
                {intervalo.de.slice(8, 10)}/{intervalo.de.slice(5, 7)} ate {intervalo.ate.slice(8, 10)}/{intervalo.ate.slice(5, 7)}
                <button onClick={() => setPeriodo("ontem")} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={14} /></button>
              </div>
            </div>
          )}

          {periodo !== "custom" && <div style={{ marginBottom: 14 }} />}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Stat ic={UserPlus} cor={C.azul} titulo="Novos leads" valor={t.leads} />
            <Stat ic={Wallet} cor={C.verde} titulo="Receita" valor={BRL(t.fat)} />
            <Stat ic={TrendingUp} cor={C.roxo} titulo="Ticket medio" valor={BRL(t.ticket)} />
            <Stat ic={ShoppingBag} cor="#6366F1" titulo="Vendas" valor={t.vendas} />
            <Stat ic={Megaphone} cor={C.vermelho} titulo="Investimento Meta" valor={BRL(t.gasto)} />
            <Stat ic={PiggyBank} cor={C.verde} titulo="Lucro" valor={BRL(t.lucro)} corValor={t.lucro >= 0 ? C.txt : C.vermelho} />
            <Stat ic={Zap} cor={C.laranja} titulo="ROAS" valor={t.roas.toFixed(2)} />
            <Stat ic={Percent} cor={C.rosa} titulo="Taxa de conv." valor={t.conv.toFixed(2) + "%"} corValor={C.roxoClaro} />
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 20, marginBottom: 16, minHeight: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 5, height: 22, background: C.roxoClaro, borderRadius: 3 }} />
              <span style={{ fontSize: 19, fontWeight: 600 }}>{aba === "vendas" ? "Vendas" : "Leads"} por periodo</span>
            </div>
            {temDados ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serie}>
                  <XAxis dataKey="label" stroke={C.mut} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(139,92,246,0.1)" }} contentStyle={{ background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 10, color: C.txt }} />
                  <Bar dataKey="v" radius={[6, 6, 0, 0]} name={aba === "vendas" ? "Vendas" : "Leads"}>
                    {serie.map((e, i) => <Cell key={i} fill={C.roxo} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.6 }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18, alignItems: "flex-end", height: 70 }}>
                  {[40, 55, 35, 65, 45, 70, 50].map((h, i) => <div key={i} style={{ width: 18, height: h, background: C.roxoEsc, borderRadius: 4, opacity: 0.5 }} />)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Sem {aba} neste periodo</div>
                <div style={{ fontSize: 14, color: C.mut, lineHeight: 1.4 }}>
                  Toque no botao <b style={{ color: C.roxoClaro }}>+ Lancar</b> para registrar os dados do dia.
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setModal(true)} style={{
            width: "100%", background: `linear-gradient(135deg, ${C.roxo}, ${C.rosa})`, color: "#fff", border: "none", borderRadius: 14,
            padding: "15px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 8,
            boxShadow: "0 6px 18px rgba(139,92,246,0.35)",
          }}>+ Lancar dia</button>
        </div>
      )}

      {tela === "anuncios" && (
        <div style={{ padding: "0 18px" }}>
          <SecaoTitulo>Relatorio de Ads</SecaoTitulo>
          {registros.length === 0 ? (
            <Vazio>Nenhum lancamento ainda.</Vazio>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              {[...registros].reverse().map((r) => {
                const luc = r.faturamento - r.gasto;
                const roi = r.gasto > 0 ? ((luc / r.gasto) * 100).toFixed(0) + "%" : "-";
                return (
                  <div key={r.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${C.cardBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700 }}>{r.data.slice(8, 10)}/{r.data.slice(5, 7)}</span>
                      <button onClick={() => remover(r.id)} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer" }}><X size={16} /></button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13 }}>
                      <Linha lbl="Gasto" v={BRL(r.gasto)} cor={C.vermelho} />
                      <Linha lbl="Receita" v={BRL(r.faturamento)} cor={C.verde} />
                      <Linha lbl="Lucro" v={BRL(luc)} cor={luc >= 0 ? C.verde : C.vermelho} />
                      <Linha lbl="ROI" v={roi} cor={C.roxoClaro} />
                      <Linha lbl="Leads" v={r.leads} cor={C.azul} />
                      <Linha lbl="Vendas" v={r.vendas} cor={C.roxoClaro} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tela === "menu" && (
        <div style={{ padding: "0 18px" }}>
          <SecaoTitulo>Resumo geral</SecaoTitulo>
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 18 }}>
            {(() => {
              const g = registros.reduce((s, r) => s + r.gasto, 0);
              const f = registros.reduce((s, r) => s + r.faturamento, 0);
              const v = registros.reduce((s, r) => s + r.vendas, 0);
              const l = registros.reduce((s, r) => s + r.leads, 0);
              const total = [["Faturamento total", BRL(f), C.verde], ["Gasto total com Ads", BRL(g), C.vermelho], ["Lucro total", BRL(f - g), f - g >= 0 ? C.verde : C.vermelho], ["ROAS geral", g > 0 ? (f / g).toFixed(2) : "0.00", C.laranja], ["Total de vendas", v, C.roxoClaro], ["Total de leads", l, C.azul], ["Conversao geral", l > 0 ? ((v / l) * 100).toFixed(2) + "%" : "0%", C.rosa]];
              return total.map(([lbl, val, cor], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < total.length - 1 ? `1px solid ${C.cardBorder}` : "none" }}>
                  <span style={{ color: C.mut, fontSize: 14 }}>{lbl}</span>
                  <span style={{ color: cor, fontWeight: 700 }}>{val}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {filtroModal && (
        <div onClick={() => setFiltroModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, maxWidth: 440, margin: "0 auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 440, borderTop: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Filtrar por periodo</h3>
              <button onClick={() => setFiltroModal(false)} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Campo lbl="De"><input type="date" value={intervalo.de} onChange={(e) => setIntervalo({ ...intervalo, de: e.target.value })} style={inp} /></Campo>
              <Campo lbl="Ate"><input type="date" value={intervalo.ate} onChange={(e) => setIntervalo({ ...intervalo, ate: e.target.value })} style={inp} /></Campo>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {[["7 dias", 7], ["15 dias", 15], ["30 dias", 30]].map(([lbl, dias]) => (
                <button key={lbl} onClick={() => {
                  const ate = dataLocal();
                  const de = new Date(Date.now() - (dias - 1) * 86400000).toISOString().slice(0, 10);
                  setIntervalo({ de, ate });
                }} style={{ background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "7px 14px", fontSize: 13, color: C.mut, fontWeight: 600, cursor: "pointer" }}>Ultimos {lbl}</button>
              ))}
            </div>
            <button onClick={aplicarIntervalo} disabled={!intervalo.de || !intervalo.ate} style={{
              width: "100%", background: (!intervalo.de || !intervalo.ate) ? C.cardBorder : `linear-gradient(135deg, ${C.roxo}, ${C.rosa})`,
              color: "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 700,
              cursor: (!intervalo.de || !intervalo.ate) ? "default" : "pointer",
            }}>Aplicar filtro</button>
          </div>
        </div>
      )}

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, maxWidth: 440, margin: "0 auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 440, borderTop: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Lancar dia</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <Campo lbl="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inp} /></Campo>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Campo lbl="Investimento Meta (R$)"><input type="number" placeholder="0,00" value={form.gasto} onChange={(e) => setForm({ ...form, gasto: e.target.value })} style={inp} /></Campo>
                <Campo lbl="Receita (R$)"><input type="number" placeholder="0,00" value={form.faturamento} onChange={(e) => setForm({ ...form, faturamento: e.target.value })} style={inp} /></Campo>
                <Campo lbl="Leads"><input type="number" placeholder="0" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} style={inp} /></Campo>
                <Campo lbl="Vendas"><input type="number" placeholder="0" value={form.vendas} onChange={(e) => setForm({ ...form, vendas: e.target.value })} style={inp} /></Campo>
              </div>
              <button onClick={adicionar} style={{ background: C.roxo, color: "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 440, margin: "0 auto", background: C.bg, borderTop: `1px solid ${C.cardBorder}`, display: "flex", padding: "12px 0 18px" }}>
        {[["resumo", "Resumo", LayoutGrid], ["anuncios", "Anuncios", Facebook], ["menu", "Menu", MenuIcon]].map(([k, lbl, Ic]) => (
          <button key={k} onClick={() => setTela(k)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            color: tela === k ? C.rosa : C.mut, display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          }}><Ic size={22} /><span style={{ fontSize: 12, fontWeight: 600 }}>{lbl}</span></button>
        ))}
      </div>
    </div>
  );
}

function Stat({ ic: Ic, cor, titulo, valor, corValor }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
      <div style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)`, width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 4px 12px ${cor}40` }}>
        <Ic size={22} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.mut, fontSize: 13, marginBottom: 2 }}>{titulo}</div>
        <div style={{ color: corValor || C.txt, fontSize: 20, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</div>
      </div>
    </div>
  );
}

function Campo({ lbl, children }) {
  return <div><label style={{ display: "block", color: C.mut, fontSize: 13, marginBottom: 6 }}>{lbl}</label>{children}</div>;
}

function Linha({ lbl, v, cor }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.mut }}>{lbl}</span><span style={{ color: cor, fontWeight: 600 }}>{v}</span></div>;
}

function SecaoTitulo({ children }) {
  return <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 16px" }}>{children}</h2>;
}

function Vazio({ children }) {
  return <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 30, textAlign: "center", color: C.mut }}>{children}</div>;
}
