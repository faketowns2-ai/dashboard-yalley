import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from "recharts";
import { UserPlus, Wallet, TrendingUp, ShoppingBag, Megaphone, PiggyBank, Zap, Percent, LayoutGrid, History, Menu as MenuIcon, SlidersHorizontal, X, Pencil, Trash2, AlertTriangle } from "lucide-react";

const BRL = (n) => "BRL " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const C = {
bg: "#0B0813", card: "#15101F", cardBorder: "#241B33", txt: "#F2EEF8", mut: "#8B8398",
roxo: "#8B5CF6", roxoClaro: "#A78BFA", azul: "#3B82F6", verde: "#10B981",
vermelho: "#EF4444", laranja: "#F97316", rosa: "#D946EF", roxoEsc: "#4C2889",
};

const API_URL = "https://script.google.com/macros/s/AKfycbzTwte_tqaV3VW8Kad1mlh24-ECYDYQVEenTPBmAFYiuWz2Cxsrde-2mWLmLYXCInXA/exec";
const POLL_MS = 30000;

function normData(v) {
if (!v) return "";
if (v instanceof Date) {
const y = v.getFullYear();
const m = String(v.getMonth() + 1).padStart(2, "0");
const d = String(v.getDate()).padStart(2, "0");
return y + "-" + m + "-" + d;
}
const s = String(v).trim();
if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
const [d, m, y] = s.split("/");
return y + "-" + m + "-" + d;
}
if (/^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}/.test(s)) {
const yearMatch = s.match(/\d{4}/);
const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
const cleaned = s.replace(/^\w{3}\s+/, "");
const parsed = new Date(cleaned.replace(/(\w+ \d+)$/, "$1 " + year));
if (!isNaN(parsed.getTime())) {
const y2 = parsed.getFullYear();
const m2 = String(parsed.getMonth() + 1).padStart(2, "0");
const d2 = String(parsed.getDate()).padStart(2, "0");
return y2 + "-" + m2 + "-" + d2;
}
}
const fb = new Date(s);
if (!isNaN(fb.getTime())) {
const y = fb.getFullYear();
const m = String(fb.getMonth() + 1).padStart(2, "0");
const d = String(fb.getDate()).padStart(2, "0");
return y + "-" + m + "-" + d;
}
return "";
}
async function lerSheets() {
if (!API_URL) return null;
const resp = await fetch(API_URL + "?t=" + Date.now());
if (!resp.ok) throw new Error("fetch failed");
const dados = await resp.json();
if (!Array.isArray(dados)) throw new Error("not array");
return dados
.filter((r) => r && r.data)
.map((r) => ({
id: normData(r.data),
data: normData(r.data),
gasto: Number(r.gasto) || 0,
faturamento: Number(r.faturamento) || 0,
leads: Number(r.leads) || 0,
vendas: Number(r.vendas) || 0,
}));
}

async function salvarSheets(registro) {
if (!API_URL) return;
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ acao: "salvar", registro }),
});
}

async function removerSheets(data) {
if (!API_URL) return;
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ acao: "remover", data }),
});
}

const dataHoje = () => {
const d = new Date();
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return y + "-" + m + "-" + day;
};

export default function App() {
const [registros, setRegistros] = useState([]);
const [carregando, setCarregando] = useState(true);
const [aba, setAba] = useState("vendas");
const [tela, setTela] = useState("resumo");
const [periodo, setPeriodo] = useState("mes");
const [modal, setModal] = useState(false);
const [filtroModal, setFiltroModal] = useState(false);
const [intervalo, setIntervalo] = useState({ de: "", ate: "" });
const [form, setForm] = useState({ data: dataHoje(), gasto: "", faturamento: "", leads: "", vendas: "" });
const [editandoId, setEditandoId] = useState(null);
const [confirmExcluir, setConfirmExcluir] = useState(null);
const [sync, setSync] = useState("local");
const [syncMsg, setSyncMsg] = useState("");
const [salvando, setSalvando] = useState(false);
const carregar = async () => {
if (API_URL) {
try {
const remoto = await lerSheets();
if (remoto && remoto.length >= 0) {
setRegistros(remoto);
setSync("online");
setSyncMsg("Atualizado: " + new Date().toLocaleTimeString("pt-BR"));
try { await window.storage.set("yalley:registros", JSON.stringify(remoto)); } catch (_) {}
return;
}
} catch (e) {
setSync("erro");
setSyncMsg("Sem conexão com Sheets");
}
}
try {
const r = await window.storage.get("yalley:registros");
if (r?.value) setRegistros(JSON.parse(r.value));
} catch (_) {}
};

useEffect(() => {
(async () => {
await carregar();
setCarregando(false);
})();
if (API_URL) {
const t = setInterval(carregar, POLL_MS);
return () => clearInterval(t);
}
}, []);

const salvarLocal = async (lista) => {
setRegistros(lista);
try { await window.storage.set("yalley:registros", JSON.stringify(lista)); } catch (_) {}
};

const abrirEditar = (r) => {
setForm({
data: r.data,
gasto: String(r.gasto),
faturamento: String(r.faturamento),
leads: String(r.leads),
vendas: String(r.vendas),
});
setEditandoId(r.id);
setModal(true);
};

const abrirNovo = () => {
setForm({ data: dataHoje(), gasto: "", faturamento: "", leads: "", vendas: "" });
setEditandoId(null);
setModal(true);
};

const salvar = async () => {
if (!form.data) return;
setSalvando(true);
const novo = {
id: form.data,
data: form.data,
gasto: parseFloat(String(form.gasto).replace(",", ".")) || 0,
faturamento: parseFloat(String(form.faturamento).replace(",", ".")) || 0,
leads: parseInt(form.leads) || 0,
vendas: parseInt(form.vendas) || 0,
};
const lista = [...registros.filter((x) => x.data !== form.data), novo]
.sort((a, b) => a.data.localeCompare(b.data));
salvarLocal(lista);
try { await salvarSheets(novo); await carregar(); } catch (_) {}
setForm({ data: dataHoje(), gasto: "", faturamento: "", leads: "", vendas: "" });
setEditandoId(null);
setModal(false);
setSalvando(false);
};

const confirmarExcluir = async (id) => {
salvarLocal(registros.filter((x) => x.id !== id));
try { await removerSheets(id); await carregar(); } catch (_) {}
setConfirmExcluir(null);
};
const filtrados = useMemo(() => {
const hoje = dataHoje();
const ontem = (() => {
const d = new Date(); d.setDate(d.getDate() - 1);
return normData(d);
})();
const mesAtual = hoje.slice(0, 7);
if (periodo === "hoje") return registros.filter((r) => r.data === hoje);
if (periodo === "ontem") return registros.filter((r) => r.data === ontem);
if (periodo === "mes") return registros.filter((r) => r.data.slice(0, 7) === mesAtual);
if (periodo === "custom") {
const de = intervalo.de || "0000-00-00";
const ate = intervalo.ate || "9999-99-99";
return registros.filter((r) => r.data >= de && r.data <= ate);
}
return registros;
}, [registros, periodo, intervalo]);

const aplicarIntervalo = () => {
if (!intervalo.de || !intervalo.ate) return;
setPeriodo("custom");
setFiltroModal(false);
};

const t = useMemo(() => {
const gasto = filtrados.reduce((s, r) => s + (Number(r.gasto) || 0), 0);
const fat = filtrados.reduce((s, r) => s + (Number(r.faturamento) || 0), 0);
const leads = filtrados.reduce((s, r) => s + (Number(r.leads) || 0), 0);
const vendas = filtrados.reduce((s, r) => s + (Number(r.vendas) || 0), 0);
return {
gasto, fat, leads, vendas,
lucro: fat - gasto,
ticket: vendas > 0 ? fat / vendas : 0,
roas: gasto > 0 ? fat / gasto : 0,
conv: leads > 0 ? (vendas / leads) * 100 : 0,
cpl: leads > 0 ? gasto / leads : 0,
};
}, [filtrados]);

const serie = useMemo(() => {
const base = (periodo === "mes" || periodo === "custom")
? [...filtrados]
: [...registros].slice(-12);
return base
.sort((a, b) => a.data.localeCompare(b.data))
.map((r) => ({
label: r.data.slice(8, 10) + "/" + r.data.slice(5, 7),
v: aba === "vendas" ? Number(r.vendas) || 0 : Number(r.leads) || 0,
}));
}, [filtrados, registros, periodo, aba]);

const temDados = serie.some((s) => s.v > 0);
const labelPeriodo = { hoje: "Hoje", ontem: "Ont.", mes: "Mês" };

const inp = {
background: C.bg, border: "1px solid " + C.cardBorder, borderRadius: 10,
color: C.txt, padding: "12px 14px", fontSize: 15, width: "100%",
outline: "none", boxSizing: "border-box",
};
if (carregando) return (
<div style={{ background: C.bg, color: C.mut, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: 24, fontWeight: 800, color: C.roxoClaro, marginBottom: 12 }}>YALLEY</div>
<div>Carregando...</div>
</div>
</div>
);

return (
<div style={{ background: C.bg, minHeight: "100vh", color: C.txt, fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 440, margin: "0 auto", position: "relative", paddingBottom: 90 }}>

{/* Logo */}
<div style={{ textAlign: "center", padding: "28px 0 16px" }}>
<div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, background: "linear-gradient(135deg, " + C.roxoClaro + ", " + C.rosa + ")", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>YALLEY</div>
<div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 6, background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 20, padding: "4px 12px" }}>
<span>👑</span>
<span style={{ fontSize: 12, fontWeight: 700, color: C.mut, letterSpacing: 1, textTransform: "uppercase" }}>Rei do Low Ticket</span>
</div>
<div style={{ marginTop: 6, fontSize: 11, color: sync === "online" ? C.verde : sync === "erro" ? C.vermelho : C.mut, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
<span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
{syncMsg || (sync === "online" ? "Sincronizado" : sync === "erro" ? "Erro no Sheets" : "Modo local")}
</div>
</div>

{/* Abas Vendas / Leads - só no resumo */}
{tela === "resumo" && (
<div style={{ display: "flex", gap: 10, padding: "0 18px 16px" }}>
{[["vendas", "Vendas", ShoppingBag], ["leads", "Leads", UserPlus]].map(([k, lbl, Ic]) => (
<button key={k} onClick={() => setAba(k)} style={{
flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
background: aba === k ? "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")" : C.card,
color: aba === k ? "#fff" : C.mut,
border: "1px solid " + (aba === k ? "transparent" : C.cardBorder),
borderRadius: 14, padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: "pointer",
boxShadow: aba === k ? "0 6px 18px rgba(139,92,246,0.35)" : "none",
}}><Ic size={17} /> {lbl}</button>
))}
</div>
)}
{/* TELA RESUMO */}
{tela === "resumo" && (
<div style={{ padding: "0 18px" }}>
<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 8 }}>
<div style={{ display: "flex", background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 20, overflow: "hidden" }}>
{["hoje", "ontem", "mes"].map((p) => (
<button key={p} onClick={() => setPeriodo(p)} style={{
background: periodo === p ? C.roxoEsc : "transparent",
color: periodo === p ? "#fff" : C.mut,
border: "none", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
}}>{labelPeriodo[p]}</button>
))}
</div>
<button onClick={() => setFiltroModal(true)} style={{
background: periodo === "custom" ? "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")" : C.card,
border: "1px solid " + (periodo === "custom" ? "transparent" : C.cardBorder),
borderRadius: 12, padding: 9, cursor: "pointer", color: C.txt, display: "grid", placeItems: "center",
}}><SlidersHorizontal size={17} /></button>
</div>
{periodo === "custom" && intervalo.de && intervalo.ate && (
<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
<div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.card, border: "1px solid " + C.roxo, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: C.roxoClaro, fontWeight: 600 }}>
{intervalo.de.slice(8)}/{intervalo.de.slice(5,7)} até {intervalo.ate.slice(8)}/{intervalo.ate.slice(5,7)}
<button onClick={() => { setPeriodo("mes"); setIntervalo({ de: "", ate: "" }); }} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}><X size={13} /></button>
</div>
</div>
)}
<div style={{ fontSize: 11, color: C.mut, textAlign: "right", marginBottom: 10 }}>
{filtrados.length} dia{filtrados.length !== 1 ? "s" : ""} no período
</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
<Stat ic={UserPlus} cor={C.azul} titulo="Novos leads" valor={t.leads} />
<Stat ic={Wallet} cor={C.verde} titulo="Receita" valor={BRL(t.fat)} />
<Stat ic={TrendingUp} cor={C.roxo} titulo="Ticket médio" valor={BRL(t.ticket)} />
<Stat ic={ShoppingBag} cor="#6366F1" titulo="Vendas" valor={t.vendas} />
<Stat ic={Megaphone} cor={C.vermelho} titulo="Invest. Meta" valor={BRL(t.gasto)} />
<Stat ic={PiggyBank} cor={t.lucro >= 0 ? C.verde : C.vermelho} titulo="Lucro" valor={BRL(t.lucro)} corValor={t.lucro >= 0 ? C.verde : C.vermelho} />
<Stat ic={Zap} cor={C.laranja} titulo="ROAS" valor={t.roas.toFixed(2)} />
<Stat ic={Percent} cor={C.rosa} titulo="Taxa de conv." valor={t.conv.toFixed(1) + "%"} corValor={C.roxoClaro} />
</div>
<div style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 18, padding: 18, marginBottom: 14, minHeight: 260 }}>
<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
<span style={{ width: 4, height: 20, background: C.roxoClaro, borderRadius: 3 }} />
<span style={{ fontSize: 17, fontWeight: 600 }}>{aba === "vendas" ? "Vendas" : "Leads"} por período</span>
</div>
{temDados ? (
<ResponsiveContainer width="100%" height={180}>
<BarChart data={serie} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
<XAxis dataKey="label" stroke={C.mut} fontSize={10} tickLine={false} axisLine={false} />
<Tooltip cursor={{ fill: "rgba(139,92,246,0.08)" }} contentStyle={{ background: C.bg, border: "1px solid " + C.cardBorder, borderRadius: 8, color: C.txt, fontSize: 13 }} formatter={(v) => [v, aba === "vendas" ? "Vendas" : "Leads"]} />
<Bar dataKey="v" radius={[5, 5, 0, 0]}>{serie.map((_, i) => <Cell key={i} fill={C.roxo} />)}</Bar>
</BarChart>
</ResponsiveContainer>
) : (
<div style={{ textAlign: "center", padding: "30px 20px", opacity: 0.55 }}>
<div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 14, alignItems: "flex-end", height: 60 }}>
{[35, 50, 30, 60, 40, 65, 45].map((h, i) => (
<div key={i} style={{ width: 16, height: h, background: C.roxoEsc, borderRadius: 3, opacity: 0.5 }} />
))}
</div>
<div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Sem dados neste período</div>
<div style={{ fontSize: 13, color: C.mut }}>Use <b style={{ color: C.roxoClaro }}>+ Lançar dia</b> para registrar</div>
</div>
)}
</div>
<button onClick={abrirNovo} style={{ width: "100%", background: "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 6, boxShadow: "0 6px 18px rgba(139,92,246,0.35)" }}>+ Lançar dia</button>
</div>
)}
{/* TELA HISTÓRICO */}
{tela === "historico" && (
<div style={{ padding: "0 18px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
<h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Histórico</h2>
<button onClick={abrirNovo} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
+ Novo
</button>
</div>
{registros.length === 0 ? (
<div style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 16, padding: 30, textAlign: "center", color: C.mut }}>
Nenhum lançamento ainda.
</div>
) : (
<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
{[...registros].sort((a,b) => b.data.localeCompare(a.data)).map((r) => {
const luc = (Number(r.faturamento) || 0) - (Number(r.gasto) || 0);
const roas = r.gasto > 0 ? (r.faturamento / r.gasto).toFixed(2) : "-";
const dia = r.data.slice(8,10) + "/" + r.data.slice(5,7) + "/" + r.data.slice(0,4);
return (
<div key={r.id} style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 16, overflow: "hidden" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px 10px", borderBottom: "1px solid " + C.cardBorder }}>
<span style={{ fontWeight: 700, fontSize: 15, color: C.roxoClaro }}>{dia}</span>
<div style={{ display: "flex", gap: 6 }}>
<button onClick={() => abrirEditar(r)} style={{ background: C.roxoEsc, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: C.roxoClaro, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
<Pencil size={13} /> Editar
</button>
<button onClick={() => setConfirmExcluir(r.id)} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: C.vermelho, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
<Trash2 size={13} /> Excluir
</button>
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
{[
["Invest.", BRL(r.gasto), C.vermelho],
["Receita", BRL(r.faturamento), C.verde],
["Lucro", BRL(luc), luc >= 0 ? C.verde : C.vermelho],
["Leads", Number(r.leads)||0, C.azul],
["Vendas", Number(r.vendas)||0, C.roxoClaro],
["ROAS", roas, C.laranja],
].map(([lbl, val, cor], i) => (
<div key={i} style={{ padding: "10px 14px", borderRight: i % 3 < 2 ? "1px solid " + C.cardBorder : "none", borderTop: i >= 3 ? "1px solid " + C.cardBorder : "none" }}>
<div style={{ fontSize: 11, color: C.mut, marginBottom: 2 }}>{lbl}</div>
<div style={{ fontSize: 13, fontWeight: 700, color: cor }}>{val}</div>
</div>
))}
</div>
</div>
);
})}
</div>
)}
</div>
)}
{/* TELA MENU */}
{tela === "menu" && (
<div style={{ padding: "0 18px" }}>
<h2 style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 14px" }}>Resumo geral</h2>
<div style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 16, padding: 18 }}>
{(() => {
const g = registros.reduce((s,r) => s + (Number(r.gasto)||0), 0);
const f = registros.reduce((s,r) => s + (Number(r.faturamento)||0), 0);
const v = registros.reduce((s,r) => s + (Number(r.vendas)||0), 0);
const l = registros.reduce((s,r) => s + (Number(r.leads)||0), 0);
const rows = [
["Faturamento total", BRL(f), C.verde],
["Gasto total Ads", BRL(g), C.vermelho],
["Lucro total", BRL(f-g), f-g>=0?C.verde:C.vermelho],
["ROAS geral", g>0?(f/g).toFixed(2):"0.00", C.laranja],
["Total de vendas", v, C.roxoClaro],
["Total de leads", l, C.azul],
["Conversão geral", l>0?((v/l)*100).toFixed(1)+"%":"0%", C.rosa],
["CPL médio", l>0?BRL(g/l):"R$ 0", C.mut],
];
return rows.map(([lbl, val, cor], i) => (
<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < rows.length-1 ? "1px solid " + C.cardBorder : "none" }}>
<span style={{ color: C.mut, fontSize: 14 }}>{lbl}</span>
<span style={{ color: cor, fontWeight: 700 }}>{val}</span>
</div>
));
})()}
</div>
<div style={{ marginTop: 14, fontSize: 12, color: C.mut, textAlign: "center" }}>
{registros.length} dia{registros.length !== 1 ? "s" : ""} registrado{registros.length !== 1 ? "s" : ""} no total
</div>
</div>
)}
{/* Modal filtro intervalo */}
{filtroModal && (
<div onClick={() => setFiltroModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
<div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 440, borderTop: "1px solid " + C.cardBorder }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
<h3 style={{ margin: 0, fontSize: 17 }}>Filtrar por período</h3>
<button onClick={() => setFiltroModal(false)} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer" }}><X size={19} /></button>
</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
<Campo lbl="De"><input type="date" value={intervalo.de} onChange={(e) => setIntervalo({ ...intervalo, de: e.target.value })} style={inp} /></Campo>
<Campo lbl="Até"><input type="date" value={intervalo.ate} onChange={(e) => setIntervalo({ ...intervalo, ate: e.target.value })} style={inp} /></Campo>
</div>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
{[["7 dias", 7], ["15 dias", 15], ["30 dias", 30]].map(([lbl, dias]) => (
<button key={lbl} onClick={() => {
const ate = dataHoje();
const d = new Date(); d.setDate(d.getDate() - (dias - 1));
const de = normData(d);
setIntervalo({ de, ate });
}} style={{ background: C.bg, border: "1px solid " + C.cardBorder, borderRadius: 20, padding: "7px 13px", fontSize: 13, color: C.mut, fontWeight: 600, cursor: "pointer" }}>
Últimos {lbl}
</button>
))}
</div>
<button onClick={aplicarIntervalo} disabled={!intervalo.de || !intervalo.ate} style={{
width: "100%", background: (!intervalo.de || !intervalo.ate) ? C.cardBorder : "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")",
color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700,
cursor: (!intervalo.de || !intervalo.ate) ? "default" : "pointer",
}}>Aplicar filtro</button>
</div>
</div>
)}
{/* Modal lançar/editar dia */}
{modal && (
<div onClick={() => { setModal(false); setEditandoId(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
<div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 440, borderTop: "1px solid " + C.cardBorder }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
<h3 style={{ margin: 0, fontSize: 17 }}>{editandoId ? "Editar lançamento" : "Lançar dia"}</h3>
<button onClick={() => { setModal(false); setEditandoId(null); }} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer" }}><X size={19} /></button>
</div>
<div style={{ display: "grid", gap: 12 }}>
<Campo lbl="Data">
<input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inp} />
</Campo>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
<Campo lbl="Invest. Meta (R$)">
<input type="number" inputMode="decimal" placeholder="0.00" value={form.gasto} onChange={(e) => setForm({ ...form, gasto: e.target.value })} style={inp} />
</Campo>
<Campo lbl="Receita (R$)">
<input type="number" inputMode="decimal" placeholder="0.00" value={form.faturamento} onChange={(e) => setForm({ ...form, faturamento: e.target.value })} style={inp} />
</Campo>
<Campo lbl="Leads">
<input type="number" inputMode="numeric" placeholder="0" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} style={inp} />
</Campo>
<Campo lbl="Vendas">
<input type="number" inputMode="numeric" placeholder="0" value={form.vendas} onChange={(e) => setForm({ ...form, vendas: e.target.value })} style={inp} />
</Campo>
</div>
<button onClick={salvar} disabled={salvando} style={{ background: salvando ? C.cardBorder : "linear-gradient(135deg, " + C.roxo + ", " + C.rosa + ")", color: "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 700, cursor: salvando ? "default" : "pointer", marginTop: 2 }}>
{salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar"}
</button>
</div>
</div>
</div>
)}

{/* Modal confirmar exclusão */}
{confirmExcluir && (
<div onClick={() => setConfirmExcluir(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
<div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, textAlign: "center" }}>
<div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
<div style={{ background: "rgba(239,68,68,0.15)", borderRadius: "50%", width: 56, height: 56, display: "grid", placeItems: "center" }}>
<AlertTriangle size={28} color={C.vermelho} />
</div>
</div>
<div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Excluir lançamento?</div>
<div style={{ fontSize: 14, color: C.mut, marginBottom: 24 }}>
{confirmExcluir && (() => {
const r = registros.find(x => x.id === confirmExcluir);
return r ? "Dia " + r.data.slice(8,10) + "/" + r.data.slice(5,7) + "/" + r.data.slice(0,4) + " será removido permanentemente." : "";
})()}
</div>
<div style={{ display: "flex", gap: 10 }}>
<button onClick={() => setConfirmExcluir(null)} style={{ flex: 1, background: C.bg, border: "1px solid " + C.cardBorder, color: C.txt, borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
<button onClick={() => confirmarExcluir(confirmExcluir)} style={{ flex: 1, background: C.vermelho, border: "none", color: "#fff", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
</div>
</div>
</div>
)}

{/* Nav inferior */}
<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 440, margin: "0 auto", background: C.bg, borderTop: "1px solid " + C.cardBorder, display: "flex", padding: "10px 0 16px" }}>
{[["resumo", "Resumo", LayoutGrid], ["historico", "Histórico", History], ["menu", "Menu", MenuIcon]].map(([k, lbl, Ic]) => (
<button key={k} onClick={() => setTela(k)} style={{
flex: 1, background: "none", border: "none", cursor: "pointer",
color: tela === k ? C.rosa : C.mut,
display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
}}>
<Ic size={21} />
<span style={{ fontSize: 11, fontWeight: 600 }}>{lbl}</span>
</button>
))}
</div>
</div>
);
}
function Stat({ ic: Ic, cor, titulo, valor, corValor }) {
return (
<div style={{ background: C.card, border: "1px solid " + C.cardBorder, borderRadius: 16, padding: 14, display: "flex", gap: 10, alignItems: "center" }}>
<div style={{ background: "linear-gradient(135deg, " + cor + ", " + cor + "cc)", width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 4px 12px " + cor + "40" }}>
<Ic size={20} color="#fff" />
</div>
<div style={{ minWidth: 0 }}>
<div style={{ color: C.mut, fontSize: 12, marginBottom: 2 }}>{titulo}</div>
<div style={{ color: corValor || C.txt, fontSize: 19, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</div>
</div>
</div>
);
}

function Campo({ lbl, children }) {
return (
<div>
<label style={{ display: "block", color: C.mut, fontSize: 13, marginBottom: 5 }}>{lbl}</label>
{children}
</div>
);
}
