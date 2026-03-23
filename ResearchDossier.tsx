"use client";

import { useState } from "react";

// ============================================================
// TYPES
// ============================================================
interface ResearchSource {
  title: string; url: string; source_platform: string; relevance_score: number;
  upvotes: number; comments_count: number; author: string; content_snippet: string;
  source_layer?: string; source_strength?: string; evidence_type?: string;
  confirmation_degree?: string; independence?: boolean; potential_bias?: string;
  observations?: string;
}
interface ResearchConflict {
  conflict_point: string; source_a: string; source_b: string;
  explanation: string; impact_on_conclusion: string;
}
interface ResearchReport {
  id: string; topic: string; summary: string | null; executive_summary: string | null;
  main_answer: string | null; full_report: string | null; conflicts: string | null;
  timeline: string | null; next_searches: string | null;
  sources_count: number; status: string; mode: string | null;
  confidence: string | null; search_contract: any; self_evaluation: any;
  created_at: string; sources: ResearchSource[] | null;
  conflict_details: ResearchConflict[] | null;
}

// ============================================================
// HELPERS
// ============================================================
function fmtDate(iso: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mdToHtml(md: string): string {
  if (!md) return "";
  return md
    .replace(/^### (.*$)/gm, '<h3 style="font-size:16px;font-weight:700;color:#7c9cff;margin:20px 0 8px">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:20px;font-weight:800;color:#dce5ff;margin:28px 0 12px;border-bottom:1px solid rgba(124,156,255,0.15);padding-bottom:8px">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-size:26px;font-weight:900;color:#eef2ff;margin:32px 0 14px">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#dce5ff">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:#aab4d6">$1</em>')
    .replace(/^- (.*$)/gm, '<div style="display:flex;gap:8px;margin:4px 0 4px 12px;line-height:1.6"><span style="color:#7c9cff">\u2022</span><span>$1</span></div>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#7c9cff;text-decoration:underline;text-underline-offset:3px">$1 \u2197</a>')
    .split("\n").map(l => {
      const t = l.trim();
      if (!t) return '<div style="height:6px"></div>';
      if (t.startsWith("<")) return t;
      return '<p style="line-height:1.75;margin:5px 0;color:#aab4d6">' + t + "</p>";
    }).join("\n");
}

// ============================================================
// CSS VARIABLES (inline object for the dossier)
// ============================================================
const V = {
  bg: "#0b1020", bgSoft: "#121933", card: "rgba(255,255,255,0.06)",
  cardStrong: "rgba(255,255,255,0.09)", text: "#eef2ff", muted: "#aab4d6",
  line: "rgba(255,255,255,0.12)", accent: "#7c9cff", accent2: "#4ee3c1",
  danger: "#ff7d7d", warning: "#ffc86b", success: "#6fe2a3",
  shadow: "0 18px 60px rgba(0,0,0,0.35)", radius: 22, radiusSm: 14,
};

// ============================================================
// SUB-COMPONENTS
// ============================================================
function Chip({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid " + V.line, borderRadius: 999, color: V.muted, fontSize: 14, ...style }}>{children}</span>;
}
function Badge({ type, children }: { type: "success" | "warning" | "danger" | "info"; children: React.ReactNode }) {
  const colors: Record<string, { bg: string; c: string; b: string }> = {
    success: { bg: "rgba(111,226,163,0.14)", c: V.success, b: "rgba(111,226,163,0.28)" },
    warning: { bg: "rgba(255,200,107,0.14)", c: V.warning, b: "rgba(255,200,107,0.28)" },
    danger: { bg: "rgba(255,125,125,0.14)", c: V.danger, b: "rgba(255,125,125,0.28)" },
    info: { bg: "rgba(124,156,255,0.14)", c: "#dbe5ff", b: "rgba(124,156,255,0.28)" },
  };
  const cl = colors[type] || colors.info;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: "0.03em", background: cl.bg, color: cl.c, border: "1px solid " + cl.b }}>{children}</span>;
}
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={{ background: V.card, border: "1px solid " + V.line, borderRadius: V.radius, padding: 22, boxShadow: V.shadow }}>
      <div style={{ color: V.muted, fontSize: 13, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 8, color: V.text }}>{String(value).padStart(2, "0")}</div>
      <div style={{ color: V.muted, fontSize: 14 }}>{sub}</div>
    </div>
  );
}
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: V.card, border: "1px solid " + V.line, borderRadius: V.radius, padding: 22, boxShadow: V.shadow, ...style }}>{children}</div>;
}
function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return <div style={{ marginBottom: 18 }}><h2 style={{ fontSize: 24, fontWeight: 800, color: V.text, margin: "0 0 6px", letterSpacing: "-0.03em" }}>{title}</h2><p style={{ margin: 0, color: V.muted, maxWidth: 720 }}>{desc}</p></div>;
}

// ============================================================
// MAIN DOSSIER COMPONENT
// ============================================================
export default function ResearchDossier({ report, onBack }: { report: ResearchReport; onBack: () => void }) {
  const [showDetails, setShowDetails] = useState(true);
  const sources = report.sources || [];
  const conflicts = report.conflict_details || [];
  const eval_ = report.self_evaluation || {};
  const contract = report.search_contract || {};
  const decomp = (report as any).decomposition || {};
  const dateStr = fmtDate(report.created_at);
  const confMap: Record<string, { pct: number; label: string; color: string }> = {
    high: { pct: 88, label: "Alto", color: V.success },
    medium: { pct: 62, label: "M\u00e9dio", color: V.warning },
    low: { pct: 35, label: "Baixo", color: V.danger },
  };
  const conf = confMap[report.confidence || "medium"] || confMap.medium;
  const modeLabels: Record<string, string> = { quick: "Consulta R\u00e1pida", analytical: "Busca Anal\u00edtica", deep: "Pesquisa Profunda" };
  const primaryCount = sources.filter(s => s.source_layer === "primary").length;
  const secondaryCount = sources.filter(s => s.source_layer === "secondary").length;
  const tertiaryCount = sources.filter(s => s.source_layer === "tertiary").length;
  let nextSearches: string[] = [];
  try { nextSearches = report.next_searches ? JSON.parse(report.next_searches) : []; } catch (_) {}

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif", color: V.text, lineHeight: 1.6 }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* TOPBAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(18px)", background: "rgba(8,16,30,0.72)", borderBottom: "1px solid " + V.line, padding: "14px 0", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid " + V.line, borderRadius: 14, padding: "10px 16px", color: V.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>&larr; Voltar</button>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg, " + V.accent + ", " + V.accent2 + ")", color: "#08101e", fontWeight: 900, boxShadow: V.shadow }}>A</div>
            <div><div style={{ fontWeight: 700, letterSpacing: "0.2px" }}>Agente de Pesquisa</div><small style={{ color: V.muted, fontWeight: 500 }}>Dossi\u00ea v2 &mdash; Mundo Roberth</small></div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["Resumo", "Achados", "Fontes", "Confian\u00e7a"].map(s => (
              <a key={s} href={"#sec-" + s.toLowerCase().replace("\u00e7", "c")} style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: V.muted, border: "1px solid transparent", fontSize: 14, textDecoration: "none" }}>{s}</a>
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ border: "1px solid " + V.line, background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))", borderRadius: 28, padding: 36, boxShadow: V.shadow, position: "relative", overflow: "hidden", marginBottom: 22 }}>
        <div style={{ position: "absolute", right: -40, bottom: -40, width: 220, height: 220, borderRadius: 999, background: "radial-gradient(circle, rgba(124,156,255,0.25), transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(124,156,255,0.12)", border: "1px solid rgba(124,156,255,0.28)", color: "#dce5ff", fontSize: 13, marginBottom: 18 }}>
            {modeLabels[report.mode || "analytical"] || "Pesquisa"} &bull; Relat\u00f3rio gerado por agente de busca
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.15, maxWidth: 900 }}>{report.topic}</h1>
          <p style={{ color: V.muted, fontSize: 17, maxWidth: 900, margin: "0 0 22px" }}>{report.executive_summary || report.summary || "Documento gerado a partir de pesquisa externa com coleta, valida\u00e7\u00e3o e an\u00e1lise."}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            <Chip>Tema: <strong>{report.topic}</strong></Chip>
            <Chip>Data: <strong>{dateStr}</strong></Chip>
            <Chip>Modo: <strong>{modeLabels[report.mode || ""] || report.mode}</strong></Chip>
            <Chip>Fontes: <strong>{sources.length}</strong></Chip>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
            <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "12px 16px", borderRadius: 14, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg, " + V.accent + ", " + V.accent2 + ")", color: "#08101e" }}>Imprimir / Exportar PDF</button>
            <button onClick={() => setShowDetails(!showDetails)} style={{ background: "rgba(255,255,255,0.06)", color: V.text, border: "1px solid " + V.line, borderRadius: 14, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{showDetails ? "Ocultar" : "Exibir"} detalhes</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, marginBottom: 22 }}>
        <KpiCard label="Fontes analisadas" value={sources.length} sub={primaryCount + " prim\u00e1rias, " + secondaryCount + " secund\u00e1rias, " + tertiaryCount + " terci\u00e1rias"} />
        <KpiCard label="Conflitos detectados" value={conflicts.length} sub="Diverg\u00eancias entre fontes" />
        <KpiCard label="Grau de confian\u00e7a" value={conf.pct + "%"} sub={conf.label + " \u2014 " + (report.confidence || "medium")} />
        <KpiCard label="Autoavalia\u00e7\u00e3o" value={(eval_.coverage || "?") + "%"} sub={"Cobertura da pergunta"} />
      </div>

      {/* RESUMO EXECUTIVO */}
      <section id="sec-resumo" style={{ paddingTop: 18 }}>
        <SectionTitle title="Resumo executivo" desc="Vis\u00e3o condensada para leitura r\u00e1pida e tomada de decis\u00e3o." />
        <div style={{ display: "grid", gridTemplateColumns: showDetails ? "1.4fr 0.9fr" : "1fr", gap: 18 }}>
          <Card>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: V.text }}>S\u00edntese principal</h3>
            <div style={{ color: V.muted, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: mdToHtml(report.executive_summary || report.summary || "") }} />
          </Card>
          {showDetails && (
            <Card>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: V.text }}>Escopo da investiga\u00e7\u00e3o</h3>
              {[
                ["Pergunta principal", contract.what_to_answer || decomp?.main_question || "\u2014"],
                ["Profundidade", contract.depth_needed || report.mode || "\u2014"],
                ["Horizonte temporal", contract.time_horizon || "\u2014"],
                ["Geografias", contract.geographies || "\u2014"],
                ["N\u00edvel de risco", contract.risk_level || "\u2014"],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "14px 0", borderBottom: i < 4 ? "1px solid " + V.line : "none" }}>
                  <span style={{ color: V.muted }}>{k}</span>
                  <strong style={{ color: V.text, textAlign: "right" }}>{v as string}</strong>
                </div>
              ))}
            </Card>
          )}
        </div>
      </section>

      {/* RESPOSTA PRINCIPAL */}
      <section style={{ paddingTop: 18 }}>
        <SectionTitle title="Resposta principal" desc="Narrativa consolidada respondendo \u00e0 pergunta." />
        <Card>
          <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15.5 }} dangerouslySetInnerHTML={{ __html: mdToHtml(report.main_answer || report.full_report || "") }} />
        </Card>
      </section>

      {/* TIMELINE */}
      {report.timeline && (
        <section style={{ paddingTop: 18 }}>
          <SectionTitle title="Linha do tempo" desc="Evolu\u00e7\u00e3o cronol\u00f3gica do tema." />
          <Card>
            <div style={{ color: V.muted, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: mdToHtml(report.timeline) }} />
          </Card>
        </section>
      )}

      {/* FONTES E EVIDENCIAS */}
      <section id="sec-fontes" style={{ paddingTop: 18 }}>
        <SectionTitle title="Fontes e evid\u00eancias" desc="Mapa de rastreabilidade das informa\u00e7\u00f5es." />
        {sources.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>{["Fonte", "Camada", "For\u00e7a", "Tipo Evid\u00eancia", "Confirma\u00e7\u00e3o", "Vi\u00e9s"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid " + V.line, color: "#dfe6ff", background: "rgba(255,255,255,0.04)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {sources.map((s, i) => {
                    const layerEmoji: Record<string, string> = { primary: "\ud83c\udfaf", secondary: "\ud83d\udcf0", tertiary: "\ud83d\udcac" };
                    const strColor: Record<string, string> = { strong: V.success, medium: V.warning, weak: V.danger };
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + V.line }}>
                        <td style={{ padding: "14px 16px", fontSize: 14 }}>
                          {s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>{(s.title || "").substring(0, 60)}</a> : (s.title || "").substring(0, 60)}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: V.muted }}>{(layerEmoji[s.source_layer || ""] || "") + " " + (s.source_layer || "\u2014")}</td>
                        <td style={{ padding: "14px 16px" }}><span style={{ color: strColor[s.source_strength || ""] || V.muted, fontWeight: 700, fontSize: 13 }}>{s.source_strength || "\u2014"}</span></td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: V.muted }}>{s.evidence_type || "\u2014"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: V.muted }}>{s.confirmation_degree || "\u2014"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: V.muted }}>{s.potential_bias || "nenhum"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* FONTES COMENTADAS + CONFLITOS */}
        <div style={{ display: "grid", gridTemplateColumns: conflicts.length > 0 ? "1.4fr 0.9fr" : "1fr", gap: 18 }}>
          <Card>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.text }}>Lista comentada de fontes</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {sources.slice(0, 10).map((s, i) => {
                const layerLabel: Record<string, string> = { primary: "Prim\u00e1ria", secondary: "Secund\u00e1ria", tertiary: "Terci\u00e1ria" };
                const strLabel: Record<string, string> = { strong: "Forte", medium: "M\u00e9dia", weak: "Fraca" };
                return (
                  <div key={i} style={{ padding: "16px 18px", borderRadius: 18, border: "1px solid " + V.line, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, color: V.text }}>{s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent }}>{(s.title || "").substring(0, 70)} \u2197</a> : (s.title || "").substring(0, 70)}</div>
                      <div style={{ color: V.muted, fontSize: 13 }}>{layerLabel[s.source_layer || ""] || ""} \u2022 {strLabel[s.source_strength || ""] || ""} \u2022 {s.evidence_type || ""}</div>
                    </div>
                    {s.content_snippet && <div style={{ color: V.muted, fontSize: 13.5, lineHeight: 1.5 }}>{s.content_snippet.substring(0, 200)}</div>}
                    {s.observations && <div style={{ color: "#7c9cff", fontSize: 12, marginTop: 6 }}>{s.observations}</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          {conflicts.length > 0 && (
            <Card>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.text }}>Conflitos e diverg\u00eancias</h3>
              {conflicts.map((c, i) => (
                <div key={i} style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line, marginBottom: 12 }}>
                  <strong style={{ display: "block", marginBottom: 6, fontSize: 16, color: V.danger }}>{c.conflict_point}</strong>
                  <div style={{ color: V.muted, fontSize: 13.5, lineHeight: 1.6 }}>{c.explanation}</div>
                  {c.impact_on_conclusion && <div style={{ color: V.warning, fontSize: 12, marginTop: 8 }}>Impacto: {c.impact_on_conclusion}</div>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </section>

      {/* CONFIANCA */}
      <section id="sec-confianca" style={{ paddingTop: 18 }}>
        <SectionTitle title="Grau de confian\u00e7a e recomenda\u00e7\u00e3o" desc="Avalia\u00e7\u00e3o da solidez do material coletado." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.text }}>Confian\u00e7a da an\u00e1lise</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              <div style={{ height: 12, width: 240, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid " + V.line }}>
                <div style={{ height: "100%", width: conf.pct + "%", borderRadius: 999, background: "linear-gradient(90deg, " + V.accent + ", " + V.accent2 + ")" }} />
              </div>
              <strong style={{ color: conf.color }}>{conf.label} ({conf.pct}%)</strong>
            </div>
            {eval_.coverage && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                {[["Cobertura", eval_.coverage], ["Precis\u00e3o", eval_.precision], ["Cita\u00e7\u00f5es", eval_.citation_quality], ["Completude", eval_.completeness]].map(([k, v], i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line }}>
                    <div style={{ fontSize: 11, color: V.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k as string}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: V.text }}>{v as string || "?"}%</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.text }}>Pr\u00f3ximas buscas recomendadas</h3>
            {nextSearches.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {nextSearches.map((n, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid " + V.line, background: "rgba(124,156,255,0.08)", color: "#dbe5ff", fontSize: 14 }}>
                    \u27a1\ufe0f {n}
                  </div>
                ))}
              </div>
            ) : <p style={{ color: V.muted }}>Nenhuma busca adicional recomendada.</p>}
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ padding: "24px 0 40px", color: V.muted, fontSize: 14 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line, borderRadius: 20, padding: "18px 20px" }}>
          <strong>Rodap\u00e9 t\u00e9cnico do agente</strong>
          <p style={{ margin: "10px 0 0" }}>
            Documento gerado pelo Agente de Pesquisa v2 do Mundo Roberth. Metodologia de 10 etapas com coleta multicanal,
            verifica\u00e7\u00e3o de conflitos, ranqueamento por relev\u00e2ncia + autoridade + rec\u00eancia e autoavalia\u00e7\u00e3o.
            {" "}| {dateStr}
          </p>
        </div>
      </div>
    </div>
  );
}
