"use client";

import { useState, useEffect, useCallback } from "react";
import { rpc } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================
interface DashboardStats {
  total_users: number; total_commands: number;
  jobs_pending: number; jobs_running: number; jobs_completed: number; jobs_failed: number;
  total_tasks: number; tasks_pending: number; tasks_completed: number;
  total_events: number; events_confirmed: number;
  total_research: number; research_completed: number; total_sources: number; total_directives: number;
}
interface Job { id: string; status: string; intent: string|null; action: string|null; confidence: string|null; user_message: string|null; user_name: string|null; created_at: string; }
interface Task { id: string; title: string; description: string|null; status: string; due_at: string|null; created_at: string; }
interface CalEvent { id: string; title: string; description: string|null; start_at: string; end_at: string|null; all_day: boolean; status: string; created_at: string; }
interface AuditEvent { id: string; status: string; message: string; created_at: string; }
interface RSource { title: string; url: string; source_platform: string; relevance_score: number; upvotes: number; comments_count: number; author: string; content_snippet: string; source_layer?: string; source_strength?: string; evidence_type?: string; confirmation_degree?: string; independence?: boolean; potential_bias?: string; observations?: string; }
interface RConflict { conflict_point: string; source_a: string; source_b: string; explanation: string; impact_on_conclusion: string; }
interface DossierSrc { title: string; url: string; key_claim: string; fills_gap: string; }
interface DossierData { id: string; title: string; status: string; executive_summary: string|null; overview: string|null; context_history: string|null; current_state: string|null; detailed_analysis: string|null; perspectives: any; key_findings: any; convergences: any; divergences: any; gaps_limitations: string|null; practical_implications: string|null; strategic_dimensions: string|null; future_trends: string|null; conclusion: string|null; confidence: string|null; confidence_why: string|null; sources_analyzed: number; new_sources_found: number; vertentes_covered: number; coverage_score: any; processing_log: any; swot_analysis?: any; created_at: string; updated_at: string; original_research: any; original_sources: any; new_sources: DossierSrc[]; }
interface PresentSection { id: string; type: string; title: string; icon: string; content: string|null; items: any[]; }
interface PresentData { id: string; title: string; subtitle: string|null; status: string; hero_section: any; table_of_contents: any; executive_summary: string|null; sections: PresentSection[]; highlights: any[]; news_links: any[]; sources_panel: any[]; timeline_data: any; conclusion: string|null; footer_meta: any; swot_visual: any; total_sections: number; total_sources: number; theme: string; language: string; generated_at: string|null; created_at: string; dossier_info: any; }
interface RReport { id: string; topic: string; summary: string|null; executive_summary: string|null; main_answer: string|null; full_report: string|null; conflicts: string|null; timeline: string|null; next_searches: string|null; sources_count: number; status: string; mode: string|null; confidence: string|null; search_contract: any; self_evaluation: any; created_at: string; sources: RSource[]|null; conflict_details: RConflict[]|null; swot_analysis?: any; }

// ============================================================
// HELPERS
// ============================================================
function fmtDate(iso: string|null) { if (!iso) return "\u2014"; return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function fmtDateLong(iso: string|null) { if (!iso) return "\u2014"; return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function timeAgo(iso: string|null) { if (!iso) return ""; const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return "agora"; if (m < 60) return m + "min"; const h = Math.floor(m / 60); if (h < 24) return h + "h"; return Math.floor(h / 24) + "d"; }

function mdHtml(md: string): string {
  if (!md) return "";
  return md
    .replace(/^### (.*$)/gm, '<h3 style="font-size:16px;font-weight:700;color:#7c9cff;margin:20px 0 8px">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:20px;font-weight:800;color:#dce5ff;margin:28px 0 12px;border-bottom:1px solid rgba(124,156,255,0.15);padding-bottom:8px">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-size:26px;font-weight:900;color:#eef2ff;margin:32px 0 14px">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#dce5ff">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:#aab4d6">$1</em>')
    .replace(/^- (.*$)/gm, '<div style="display:flex;gap:8px;margin:4px 0 4px 12px;line-height:1.6"><span style="color:#7c9cff">\u2022</span><span>$1</span></div>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#7c9cff;text-decoration:underline;text-underline-offset:3px">$1 \u2197</a>')
    .split("\n").map(l => { const t = l.trim(); if (!t) return '<div style="height:6px"></div>'; if (t.startsWith("<")) return t; return '<p style="line-height:1.75;margin:5px 0;color:#aab4d6">' + t + "</p>"; }).join("\n");
}

// ============================================================
// DESIGN TOKENS
// ============================================================
const V = { bg: "#0b1020", card: "rgba(255,255,255,0.06)", text: "#eef2ff", muted: "#aab4d6", line: "rgba(255,255,255,0.12)", accent: "#7c9cff", accent2: "#4ee3c1", danger: "#ff7d7d", warning: "#ffc86b", success: "#6fe2a3", shadow: "0 18px 60px rgba(0,0,0,0.35)", radius: 22 };

const stColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  running: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  completed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  researching: { bg: "rgba(168,85,247,0.15)", text: "#a855f7", border: "rgba(168,85,247,0.3)" },
  failed: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  confirmed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  cancelled: { bg: "rgba(107,114,128,0.15)", text: "#6b7280", border: "rgba(107,114,128,0.3)" },
};

// ============================================================
// MICRO COMPONENTS
// ============================================================
function SBadge({ s }: { s: string }) { const c = stColors[s] || stColors.pending; return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, background: c.bg, color: c.text, border: "1px solid " + c.border }}>{s}</span>; }

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return <div style={{ background: V.card, border: "1px solid " + V.line, borderRadius: V.radius, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: accent, filter: "blur(25px)" }} />
    <div style={{ fontSize: 22, opacity: 0.7 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.5, fontFamily: "'DM Mono', monospace", color: V.text }}>{value}</div>
    <div style={{ fontSize: 12, color: V.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
  </div>;
}

function Card({ children, style = {}, className = "", id }: { children: React.ReactNode; style?: React.CSSProperties; className?: string; id?: string }) {
  return <div id={id} className={className} style={{ background: V.card, border: "1px solid " + V.line, borderRadius: V.radius, padding: 22, boxShadow: V.shadow, ...style }}>{children}</div>;
}

// SWOT COMPONENT
function SwotSection({ swot }: { swot: any }) {
  if (!swot || !swot.applicable) return null;
  const qColors: Record<string, { bg: string; border: string; icon: string; label: string }> = {
    s: { bg: "rgba(111,226,163,0.08)", border: "rgba(111,226,163,0.2)", icon: "\ud83d\udfe2", label: "For\u00e7as (Strengths)" },
    w: { bg: "rgba(255,125,125,0.08)", border: "rgba(255,125,125,0.2)", icon: "\ud83d\udd34", label: "Fraquezas (Weaknesses)" },
    o: { bg: "rgba(255,200,107,0.08)", border: "rgba(255,200,107,0.2)", icon: "\ud83d\udfe1", label: "Oportunidades (Opportunities)" },
    t: { bg: "rgba(124,156,255,0.08)", border: "rgba(124,156,255,0.2)", icon: "\u26a0\ufe0f", label: "Amea\u00e7as (Threats)" },
  };
  const crossLabels: Record<string, { icon: string; label: string; desc: string }> = {
    fo: { icon: "\ud83d\udfe2\ud83d\udfe1", label: "FO", desc: "For\u00e7as \u00d7 Oportunidades" },
    fa: { icon: "\ud83d\udfe2\u26a0\ufe0f", label: "FA", desc: "For\u00e7as \u00d7 Amea\u00e7as" },
    do: { icon: "\ud83d\udd34\ud83d\udfe1", label: "DO", desc: "Fraquezas \u00d7 Oportunidades" },
    da: { icon: "\ud83d\udd34\u26a0\ufe0f", label: "DA", desc: "Fraquezas \u00d7 Amea\u00e7as" },
  };
  return (
    <Card style={{ marginBottom: 18, border: "1px solid rgba(124,156,255,0.2)", background: "linear-gradient(180deg, rgba(124,156,255,0.04), rgba(255,255,255,0.03))" }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px", color: V.text }}>{"\ud83d\udcca"} An\u00e1lise SWOT / FOFA</h3>
      {swot.context_intro && <p style={{ color: V.muted, lineHeight: 1.7, marginBottom: 18, fontSize: 14 }}>{swot.context_intro}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        {[["s", swot.strengths], ["w", swot.weaknesses], ["o", swot.opportunities], ["t", swot.threats]].map(([key, items]) => {
          const c = qColors[key as string];
          return (
            <div key={key as string} style={{ borderRadius: 16, border: "1px solid " + c.border, background: c.bg, padding: "16px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: V.text }}>{c.icon} {c.label}</div>
              {(items as any[] || []).map((item: any, i: number) => (
                <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                  <strong style={{ color: V.text }}>{item.item}</strong>
                  {item.evidence && <div style={{ color: V.muted, fontSize: 12, marginTop: 2 }}>{item.evidence}</div>}
                </div>
              ))}
              {(!items || !(items as any[]).length) && <div style={{ color: V.muted, fontSize: 12 }}>Nenhum identificado</div>}
            </div>
          );
        })}
      </div>
      {swot.cross_strategies && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: V.accent }}>Cruzamento Estrat\u00e9gico</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["fo", "fa", "do", "da"].map(k => {
              const cl = crossLabels[k]; const items = swot.cross_strategies[k] || [];
              return (
                <div key={k} style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid " + V.line, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{cl.icon} {cl.label} <span style={{ color: V.muted, fontWeight: 400 }}>({cl.desc})</span></div>
                  {items.map((item: string, i: number) => <div key={i} style={{ color: V.muted, fontSize: 12, marginBottom: 4 }}>{"\u2022"} {item}</div>)}
                  {!items.length && <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>\u2014</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {swot.action_plan && swot.action_plan.length > 0 && (
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: V.accent2 }}>{"\u27a1\ufe0f"} Plano de A\u00e7\u00e3o</h4>
          {swot.action_plan.map((a: string, i: number) => (
            <div key={i} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(78,227,193,0.2)", background: "rgba(78,227,193,0.06)", marginBottom: 8, color: V.text, fontSize: 14 }}>{(i+1)}. {a}</div>
          ))}
        </div>
      )}
    </Card>
  );
}

function GPanel({ title, icon, children, full = false }: { title: string; icon: string; children: React.ReactNode; full?: boolean }) {
  return <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", border: "1px solid " + V.line, borderRadius: 20, overflow: "hidden" }}>
    <div style={{ padding: "16px 22px", borderBottom: "1px solid " + V.line, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
    </div>
    <div style={{ padding: "12px 18px", maxHeight: full ? "none" : 360, overflowY: "auto" }}>{children}</div>
  </div>;
}

// ============================================================
// RESEARCH DOSSIER (integrated from template)
// ============================================================
function Dossier({ r, onBack }: { r: RReport; onBack: () => void }) {
  const [showDet, setShowDet] = useState(true);
  const src = r.sources || []; const conf_ = r.conflict_details || []; const ev = r.self_evaluation || {}; const ct = r.search_contract || {};
  const dateStr = fmtDateLong(r.created_at);
  const confMap: Record<string, { pct: number; lbl: string; col: string }> = { high: { pct: 88, lbl: "Alto", col: V.success }, medium: { pct: 62, lbl: "M\u00e9dio", col: V.warning }, low: { pct: 35, lbl: "Baixo", col: V.danger } };
  const cf = confMap[r.confidence || "medium"] || confMap.medium;
  const modeL: Record<string, string> = { quick: "Consulta R\u00e1pida", analytical: "Busca Anal\u00edtica", deep: "Pesquisa Profunda" };
  const prim = src.filter(s => s.source_layer === "primary").length;
  const sec = src.filter(s => s.source_layer === "secondary").length;
  const tert = src.filter(s => s.source_layer === "tertiary").length;
  let nextS: string[] = []; try { nextS = r.next_searches ? JSON.parse(r.next_searches) : []; } catch (_) {}
  const layerE: Record<string, string> = { primary: "\ud83c\udfaf", secondary: "\ud83d\udcf0", tertiary: "\ud83d\udcac" };
  const strC: Record<string, string> = { strong: V.success, medium: V.warning, weak: V.danger };

  return <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: V.text, lineHeight: 1.6, animation: "slideIn 0.4s ease" }}>
    {/* TOPBAR */}
    <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(18px)", background: "rgba(8,16,30,0.72)", borderBottom: "1px solid " + V.line, padding: "14px 0", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid " + V.line, borderRadius: 14, padding: "10px 16px", color: V.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>&larr; Voltar</button>
          <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg, " + V.accent + ", " + V.accent2 + ")", color: "#08101e", fontWeight: 900, boxShadow: V.shadow }}>A</div>
          <div><div style={{ fontWeight: 700 }}>Agente de Pesquisa</div><small style={{ color: V.muted }}>Dossi\u00ea v2</small></div>
        </div>
      </div>
    </div>

    {/* HERO */}
    <div style={{ border: "1px solid " + V.line, background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))", borderRadius: 28, padding: 36, boxShadow: V.shadow, position: "relative", overflow: "hidden", marginBottom: 22 }}>
      <div style={{ position: "absolute", right: -40, bottom: -40, width: 220, height: 220, borderRadius: 999, background: "radial-gradient(circle, rgba(124,156,255,0.25), transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(124,156,255,0.12)", border: "1px solid rgba(124,156,255,0.28)", color: "#dce5ff", fontSize: 13, marginBottom: 18 }}>{modeL[r.mode || "analytical"] || "Pesquisa"}</div>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.15 }}>{r.topic}</h1>
        <p style={{ color: V.muted, fontSize: 16, maxWidth: 880, margin: "0 0 18px" }}>{(r.executive_summary || r.summary || "").substring(0, 300)}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[["Data", dateStr], ["Fontes", String(src.length)], ["Modo", modeL[r.mode || ""] || r.mode || ""]].map(([k, v], i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid " + V.line, borderRadius: 999, color: V.muted, fontSize: 14 }}>{k}: <strong style={{ color: V.text }}>{v}</strong></span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "12px 16px", borderRadius: 14, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg, " + V.accent + ", " + V.accent2 + ")", color: "#08101e" }}>Imprimir / PDF</button>
          <button onClick={() => setShowDet(!showDet)} style={{ background: "rgba(255,255,255,0.06)", color: V.text, border: "1px solid " + V.line, borderRadius: 14, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{showDet ? "Ocultar" : "Exibir"} detalhes</button>
        </div>
      </div>
    </div>

    {/* KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 22 }}>
      <Card><div style={{ color: V.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Fontes</div><div style={{ fontSize: 40, fontWeight: 800 }}>{String(src.length).padStart(2, "0")}</div><div style={{ color: V.muted, fontSize: 14 }}>{prim} prim. {sec} sec. {tert} terc.</div></Card>
      <Card><div style={{ color: V.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Conflitos</div><div style={{ fontSize: 40, fontWeight: 800 }}>{String(conf_.length).padStart(2, "0")}</div><div style={{ color: V.muted, fontSize: 14 }}>Diverg\u00eancias entre fontes</div></Card>
      <Card><div style={{ color: V.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Confian\u00e7a</div><div style={{ fontSize: 40, fontWeight: 800, color: cf.col }}>{cf.pct}%</div><div style={{ color: V.muted, fontSize: 14 }}>{cf.lbl}</div></Card>
      <Card><div style={{ color: V.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Cobertura</div><div style={{ fontSize: 40, fontWeight: 800 }}>{ev.coverage || "?"}%</div><div style={{ color: V.muted, fontSize: 14 }}>Autoavalia\u00e7\u00e3o</div></Card>
    </div>

    {/* RESUMO + ESCOPO */}
    <div style={{ display: "grid", gridTemplateColumns: showDet ? "1.4fr 0.9fr" : "1fr", gap: 18, marginBottom: 22 }}>
      <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>S\u00edntese Principal</h3><div style={{ color: V.muted, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: mdHtml(r.executive_summary || r.summary || "") }} /></Card>
      {showDet && <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Escopo</h3>
        {[["Pergunta", ct.what_to_answer || "\u2014"], ["Profundidade", ct.depth_needed || r.mode || "\u2014"], ["Horizonte", ct.time_horizon || "\u2014"], ["Risco", ct.risk_level || "\u2014"]].map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 3 ? "1px solid " + V.line : "none" }}>
            <span style={{ color: V.muted }}>{k}</span><strong>{v}</strong>
          </div>
        ))}
      </Card>}
    </div>

    {/* RESPOSTA PRINCIPAL */}
    <Card style={{ marginBottom: 22 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Resposta Principal</h3>
      <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(r.main_answer || r.full_report || "") }} />
    </Card>

    {/* TIMELINE */}
    {r.timeline && <Card style={{ marginBottom: 22 }}><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Linha do Tempo</h3><div style={{ color: V.muted, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: mdHtml(r.timeline) }} /></Card>}

    {/* FONTES - TABELA */}
    {src.length > 0 && <Card style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead><tr>{["Fonte", "Camada", "For\u00e7a", "Evid\u00eancia", "Confirma\u00e7\u00e3o", "Vi\u00e9s"].map(h => (
            <th key={h} style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid " + V.line, color: "#dfe6ff", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
          ))}</tr></thead>
          <tbody>{src.map((s, i) => (
            <tr key={i} style={{ borderBottom: "1px solid " + V.line }}>
              <td style={{ padding: "12px 16px", fontSize: 13 }}>{s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent, textDecoration: "underline" }}>{(s.title || "").substring(0, 55)}</a> : (s.title || "").substring(0, 55)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: V.muted }}>{(layerE[s.source_layer || ""] || "") + " " + (s.source_layer || "\u2014")}</td>
              <td style={{ padding: "12px 16px" }}><span style={{ color: strC[s.source_strength || ""] || V.muted, fontWeight: 700, fontSize: 12 }}>{s.source_strength || "\u2014"}</span></td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: V.muted }}>{s.evidence_type || "\u2014"}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: V.muted }}>{s.confirmation_degree || "\u2014"}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: V.muted }}>{s.potential_bias || "nenhum"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>}

    {/* FONTES COMENTADAS + CONFLITOS */}
    <div style={{ display: "grid", gridTemplateColumns: conf_.length > 0 ? "1.4fr 0.9fr" : "1fr", gap: 18, marginBottom: 22 }}>
      <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Fontes Comentadas</h3>
        {src.slice(0, 8).map((s, i) => {
          const lL: Record<string, string> = { primary: "Prim\u00e1ria", secondary: "Secund\u00e1ria", tertiary: "Terci\u00e1ria" };
          return <div key={i} style={{ padding: "14px 16px", borderRadius: 18, border: "1px solid " + V.line, background: "rgba(255,255,255,0.04)", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700 }}>{s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent }}>{(s.title || "").substring(0, 65)} \u2197</a> : (s.title || "").substring(0, 65)}</div>
              <div style={{ color: V.muted, fontSize: 12 }}>{lL[s.source_layer || ""] || ""} \u2022 {s.source_strength || ""}</div>
            </div>
            {s.content_snippet && <div style={{ color: V.muted, fontSize: 13 }}>{s.content_snippet.substring(0, 180)}</div>}
          </div>;
        })}
      </Card>
      {conf_.length > 0 && <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.danger }}>Conflitos</h3>
        {conf_.map((c, i) => <div key={i} style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,125,125,0.06)", border: "1px solid rgba(255,125,125,0.15)", marginBottom: 10 }}>
          <strong style={{ display: "block", marginBottom: 4, color: V.danger }}>{c.conflict_point}</strong>
          <div style={{ color: V.muted, fontSize: 13 }}>{c.explanation}</div>
          {c.impact_on_conclusion && <div style={{ color: V.warning, fontSize: 12, marginTop: 6 }}>Impacto: {c.impact_on_conclusion}</div>}
        </div>)}
      </Card>}
    </div>

    {/* CONFIANCA + PROXIMAS */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
      <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Confian\u00e7a</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 16px" }}>
          <div style={{ height: 12, width: 240, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid " + V.line }}><div style={{ height: "100%", width: cf.pct + "%", borderRadius: 999, background: "linear-gradient(90deg, " + V.accent + ", " + V.accent2 + ")" }} /></div>
          <strong style={{ color: cf.col }}>{cf.lbl} ({cf.pct}%)</strong>
        </div>
        {ev.coverage && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["Cobertura", ev.coverage], ["Precis\u00e3o", ev.precision], ["Cita\u00e7\u00f5es", ev.citation_quality], ["Completude", ev.completeness]].map(([k, v], i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line }}>
              <div style={{ fontSize: 11, color: V.muted, textTransform: "uppercase" }}>{k as string}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{v as string || "?"}%</div>
            </div>
          ))}
        </div>}
      </Card>
      <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Pr\u00f3ximas Buscas</h3>
        {nextS.length > 0 ? nextS.map((n, i) => <div key={i} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid " + V.line, background: "rgba(124,156,255,0.08)", color: "#dbe5ff", fontSize: 14, marginBottom: 8 }}>\u27a1\ufe0f {n}</div>) : <p style={{ color: V.muted }}>Nenhuma recomendada.</p>}
      </Card>
    </div>

    {/* SWOT */}
    <SwotSection swot={r.swot_analysis} />

    {/* FOOTER */}
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line, borderRadius: 20, padding: "18px 20px", color: V.muted, fontSize: 14, marginBottom: 40 }}>
      <strong>Rodap\u00e9 t\u00e9cnico</strong>
      <p style={{ margin: "8px 0 0" }}>Agente de Pesquisa v2 | Metodologia de 10 etapas | Mundo Roberth | {dateStr}</p>
    </div>
  </div>;
}

// ============================================================
// RESEARCH LIST
// ============================================================
function RList({ reports, onSelect }: { reports: RReport[]; onSelect: (r: RReport) => void }) {
  if (!reports.length) return <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.2)" }}><div style={{ fontSize: 56, marginBottom: 16 }}>\ud83d\udd0d</div><div style={{ fontSize: 16, fontWeight: 700 }}>Nenhuma pesquisa</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Mande &quot;Pesquisar sobre...&quot; pro bot</div></div>;
  const mL: Record<string, string> = { quick: "\u26a1", analytical: "\ud83d\udd0d", deep: "\ud83e\udde0" };
  const cL: Record<string, string> = { high: "\ud83d\udfe2", medium: "\ud83d\udfe1", low: "\ud83d\udd34" };
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
    {reports.map((r, i) => <div key={r.id} onClick={() => r.status === "completed" && onSelect(r)}
      style={{ background: V.card, border: "1px solid " + V.line, borderRadius: 18, padding: "24px 26px", cursor: r.status === "completed" ? "pointer" : "default", transition: "all 0.3s", position: "relative", overflow: "hidden", animation: "slideIn 0.4s ease " + (i * 0.06) + "s both" }}
      onMouseEnter={e => { if (r.status === "completed") { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,156,255,0.25)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = V.line; (e.currentTarget as HTMLElement).style.transform = ""; }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><SBadge s={r.status} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{(mL[r.mode || ""] || "") + " " + timeAgo(r.created_at)}</span></div>
      <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.35 }}>{r.topic}</h3>
      {r.summary && <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 14px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{(r.executive_summary || r.summary || "").replace(/[#*]/g, "").substring(0, 200)}</p>}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>\ud83d\udcca {r.sources_count} fontes</span>
        {r.confidence && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{cL[r.confidence] || ""} {r.confidence}</span>}
        {r.status === "completed" && <span style={{ fontSize: 11, color: "#7c9cff", fontWeight: 600 }}>Abrir dossi\u00ea \u2192</span>}
      </div>
    </div>)}
  </div>;
}

// ============================================================
// TABS
// ============================================================
const tabs = [
  { id: "overview", label: "Vis\u00e3o Geral", icon: "\u26a1" },
  { id: "research", label: "Pesquisas", icon: "\ud83d\udd0d" },
  { id: "dossiers", label: "Dossi\u00eas", icon: "\ud83d\udcda" },
  { id: "presentations", label: "Apresenta\u00e7\u00f5es", icon: "\ud83d\udcca" },
  { id: "jobs", label: "Jobs", icon: "\ud83d\udd04" },
  { id: "tasks", label: "Tarefas", icon: "\ud83d\udccb" },
  { id: "calendar", label: "Calend\u00e1rio", icon: "\ud83d\udcc5" },
  { id: "audit", label: "Auditoria", icon: "\ud83d\udd0e" },
];

// ============================================================
// MAIN
// ============================================================
export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [research, setResearch] = useState<RReport[]>([]);
  const [selReport, setSelReport] = useState<RReport | null>(null);
  const [dossiers, setDossiers] = useState<DossierData[]>([]);
  const [selDossier, setSelDossier] = useState<DossierData | null>(null);
  const [genLoading, setGenLoading] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<PresentData[]>([]);
  const [selPresentation, setSelPresentation] = useState<PresentData | null>(null);
  const [presLoading, setPresLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUp, setLastUp] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchAll = useCallback(async () => {
    try { setPulse(true);
      const [s, j, t, e, a, rr, dd, pp] = await Promise.all([rpc<DashboardStats>("get_dashboard_stats"), rpc<Job[]>("get_recent_jobs", { p_limit: 20 }), rpc<Task[]>("get_all_tasks"), rpc<CalEvent[]>("get_all_calendar_events"), rpc<AuditEvent[]>("get_recent_events", { p_limit: 30 }), rpc<RReport[]>("get_all_research_reports"), rpc<DossierData[]>("get_all_dossiers"), rpc<PresentData[]>("get_all_presentations")]);
      setStats(s); setJobs(j || []); setTasks(t || []); setEvents(e || []); setAudit(a || []); setResearch(rr || []); setDossiers(dd || []); setPresentations(pp || []); setLastUp(new Date()); setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); setTimeout(() => setPulse(false), 600); }
  }, []);
  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 10000); return () => clearInterval(iv); }, [fetchAll]);

  if (loading) return <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}><div style={{ width: 48, height: 48, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Conectando...</div></div>;

  return <div style={{ minHeight: "100vh", color: "#fff", background: "#09090b", position: "relative", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800;900&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}@keyframes pulse-glow{0%,100%{opacity:.3}50%{opacity:.7}}@keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(124,156,255,0.3);border-radius:4px}*{box-sizing:border-box;margin:0;padding:0}@media print{.no-print{display:none!important}}`}</style>
    <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,156,255,0.08) 0%, transparent 70%)", animation: "float 20s ease-in-out infinite", pointerEvents: "none" }} />

    {/* HEADER */}
    <header className="no-print" style={{ position: "relative", zIndex: 10, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #7c9cff, #4ee3c1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: V.shadow }}>\ud83c\udf0d</div>
        <div><div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>MUNDO ROBERTH</div><div style={{ fontSize: 11, color: V.muted, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Dashboard v0.4</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)", animation: pulse ? "pulse-glow 0.6s ease" : "none" }} />
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>LIVE</span>
        </div>
        <span style={{ fontSize: 11, color: V.muted }}>{lastUp ? timeAgo(lastUp.toISOString()) : ""}</span>
        <button onClick={fetchAll} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>\u21bb</button>
      </div>
    </header>

    {/* NAV */}
    <nav className="no-print" style={{ position: "relative", zIndex: 10, padding: "0 32px", display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.04)", overflowX: "auto" }}>
      {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setSelReport(null); setSelDossier(null); setSelPresentation(null); }} style={{ padding: "14px 18px", background: "none", border: "none", cursor: "pointer", color: tab === t.id ? "#fff" : "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: tab === t.id ? 700 : 500, borderBottom: tab === t.id ? "2px solid #7c9cff" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <span>{t.icon}</span> {t.label}
        {t.id === "research" && research.length > 0 && <span style={{ background: "rgba(124,156,255,0.2)", color: "#7c9cff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 10, marginLeft: 2 }}>{research.length}</span>}
      </button>)}
    </nav>

    {err && <div style={{ margin: "16px 32px", padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{err}</div>}

    <main style={{ position: "relative", zIndex: 10, padding: "24px 32px", animation: "slideIn 0.3s ease" }}>
      {/* OVERVIEW */}
      {tab === "overview" && stats && <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <StatCard label="Usu\u00e1rios" value={stats.total_users} icon="\ud83d\udc64" accent="rgba(124,156,255,0.08)" />
          <StatCard label="Comandos" value={stats.total_commands} icon="\ud83d\udcac" accent="rgba(78,227,193,0.08)" />
          <StatCard label="Conclu\u00eddos" value={stats.jobs_completed} icon="\u2705" accent="rgba(111,226,163,0.08)" />
          <StatCard label="Pesquisas" value={stats.total_research || 0} icon="\ud83d\udd0d" accent="rgba(124,156,255,0.08)" />
          <StatCard label="Tarefas" value={stats.total_tasks} icon="\ud83d\udccb" accent="rgba(255,200,107,0.08)" />
          <StatCard label="Fontes" value={stats.total_sources || 0} icon="\ud83d\udd17" accent="rgba(78,227,193,0.08)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <GPanel title="\u00daltimos Jobs" icon="\ud83d\udd04">{jobs.slice(0, 8).map((j, i) => <div key={j.id} style={{ padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.user_message ? String(j.user_message).replace(/"/g, "") : "\u2014"}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{j.intent || "..."} \u00b7 {timeAgo(j.created_at)}</div></div><SBadge s={j.status} /></div>)}</GPanel>
          <GPanel title="Auditoria" icon="\ud83d\udd0e">{audit.slice(0, 10).map((a, i) => <div key={a.id} style={{ padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", animation: "slideIn 0.3s ease " + (i * 0.04) + "s both" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><SBadge s={a.status} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(a.created_at)}</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.message}</div></div>)}</GPanel>
        </div>
      </div>}

      {/* RESEARCH */}
      {tab === "research" && (selReport ? <Dossier r={selReport} onBack={() => setSelReport(null)} /> : <RList reports={research} onSelect={setSelReport} />)}

      {/* DOSSIERS TAB */}
      {tab === "dossiers" && (selDossier ? (
        <div style={{ animation: "slideIn 0.4s ease" }}>
          <button onClick={() => setSelDossier(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid " + V.line, borderRadius: 14, padding: "10px 16px", color: V.muted, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>&larr; Voltar</button>
          {/* DOSSIER HERO */}
          <div style={{ border: "1px solid rgba(78,227,193,0.2)", background: "linear-gradient(180deg, rgba(78,227,193,0.06), rgba(255,255,255,0.04))", borderRadius: 28, padding: 36, boxShadow: V.shadow, marginBottom: 22 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(78,227,193,0.12)", border: "1px solid rgba(78,227,193,0.28)", color: "#4ee3c1", fontSize: 13, marginBottom: 18 }}>{"\ud83d\udcda"} Dossi\u00ea Aprofundado</div>
            <h1 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.15 }}>{selDossier.title}</h1>
            <p style={{ color: V.muted, fontSize: 15, maxWidth: 880, margin: "0 0 14px" }}>{(selDossier.executive_summary || "").substring(0, 250)}...</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[["Fontes originais", String(selDossier.sources_analyzed)], ["Fontes novas", String(selDossier.new_sources_found)], ["Vertentes", String(selDossier.vertentes_covered)], ["Confian\u00e7a", selDossier.confidence || "\u2014"]].map(([k, v], i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid " + V.line, borderRadius: 999, color: V.muted, fontSize: 14 }}>{k}: <strong style={{ color: V.text }}>{v}</strong></span>
              ))}
            </div>
          </div>
          {/* DOSSIER SECTIONS */}
          {[
            ["Resumo Executivo", selDossier.executive_summary],
            ["Vis\u00e3o Geral", selDossier.overview],
            ["Contexto e Antecedentes", selDossier.context_history],
            ["Cen\u00e1rio Atual", selDossier.current_state],
            ["An\u00e1lise Detalhada", selDossier.detailed_analysis],
            ["Dimens\u00f5es Estrat\u00e9gicas", selDossier.strategic_dimensions],
            ["Tend\u00eancias Futuras", selDossier.future_trends],
            ["Implica\u00e7\u00f5es Pr\u00e1ticas", selDossier.practical_implications],
            ["Lacunas e Limita\u00e7\u00f5es", selDossier.gaps_limitations],
            ["Conclus\u00e3o", selDossier.conclusion],
          ].filter(([_, v]) => v).map(([title, content], i) => (
            <Card key={i} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.text }}>{title as string}</h3>
              <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(content as string || "") }} />
            </Card>
          ))}
          {/* PERSPECTIVES */}
          {selDossier.perspectives && (selDossier.perspectives as any[]).length > 0 && (
            <Card style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Vertentes e Perspectivas</h3>
              {(selDossier.perspectives as any[]).map((p: any, i: number) => (
                <div key={i} style={{ padding: "14px 16px", borderRadius: 16, border: "1px solid " + V.line, background: "rgba(78,227,193,0.04)", marginBottom: 10 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#4ee3c1" }}>{p.name}</strong>
                  <div style={{ color: V.muted, fontSize: 14, lineHeight: 1.7 }}>{p.content || p.description || ""}</div>
                </div>
              ))}
            </Card>
          )}
          {/* KEY FINDINGS */}
          {selDossier.key_findings && (selDossier.key_findings as any[]).length > 0 && (
            <Card style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Principais Achados</h3>
              {(selDossier.key_findings as any[]).map((f: any, i: number) => {
                const typeC: Record<string, { bg: string; c: string }> = { confirmed: { bg: "rgba(111,226,163,0.14)", c: V.success }, disputed: { bg: "rgba(255,200,107,0.14)", c: V.warning }, emerging: { bg: "rgba(124,156,255,0.14)", c: V.accent } };
                const tc = typeC[f.type] || typeC.emerging;
                return <div key={i} style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid " + V.line, background: tc.bg, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tc.c, textTransform: "uppercase" }}>{f.type}</span>
                  <div style={{ fontWeight: 600, marginTop: 4, color: V.text }}>{f.finding}</div>
                  {f.evidence && <div style={{ fontSize: 13, color: V.muted, marginTop: 4 }}>{f.evidence}</div>}
                </div>;
              })}
            </Card>
          )}
          {/* CONVERGENCES + DIVERGENCES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {selDossier.convergences && (selDossier.convergences as any[]).length > 0 && (
              <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.success }}>Converg\u00eancias</h3>
                {(selDossier.convergences as any[]).map((c: any, i: number) => <div key={i} style={{ padding: "10px 0", borderBottom: i < (selDossier.convergences as any[]).length - 1 ? "1px solid " + V.line : "none", color: V.muted, fontSize: 14 }}>{"\u2705"} {typeof c === "string" ? c : c.point || JSON.stringify(c)}</div>)}
              </Card>
            )}
            {selDossier.divergences && (selDossier.divergences as any[]).length > 0 && (
              <Card><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: V.danger }}>Diverg\u00eancias</h3>
                {(selDossier.divergences as any[]).map((d: any, i: number) => <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid " + V.line }}>
                  <strong style={{ color: V.danger, fontSize: 14 }}>{d.point || ""}</strong>
                  <div style={{ color: V.muted, fontSize: 13, marginTop: 4 }}>{d.assessment || d.sides || ""}</div>
                </div>)}
              </Card>
            )}
          </div>
          {/* CONFIDENCE */}
          {selDossier.confidence && (
            <Card style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Grau de Confian\u00e7a</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ height: 12, width: 240, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid " + V.line }}><div style={{ height: "100%", width: (selDossier.confidence === "high" ? 88 : selDossier.confidence === "medium" ? 62 : 35) + "%", borderRadius: 999, background: "linear-gradient(90deg, " + V.accent + ", " + V.accent2 + ")" }} /></div>
                <strong style={{ color: selDossier.confidence === "high" ? V.success : selDossier.confidence === "low" ? V.danger : V.warning }}>{selDossier.confidence}</strong>
              </div>
              {selDossier.confidence_why && <p style={{ color: V.muted, marginTop: 12, fontSize: 14 }}>{selDossier.confidence_why}</p>}
            </Card>
          )}
          {/* SWOT */}
          <SwotSection swot={selDossier.swot_analysis} />
          {/* SOURCES */}
          {(selDossier.new_sources || []).length > 0 && (
            <Card style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Fontes de Expans\u00e3o ({selDossier.new_sources.length})</h3>
              {selDossier.new_sources.map((s, i) => (
                <div key={i} style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid " + V.line, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: V.text }}>{s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent }}>{s.title} {"\u2197"}</a> : s.title}</div>
                  {s.key_claim && <div style={{ color: V.muted, fontSize: 13, marginTop: 4 }}>{s.key_claim}</div>}
                  {s.fills_gap && <div style={{ color: "#4ee3c1", fontSize: 12, marginTop: 4 }}>Preenche: {s.fills_gap}</div>}
                </div>
              ))}
            </Card>
          )}
          {/* FOOTER */}
          <div style={{ background: "rgba(78,227,193,0.04)", border: "1px solid rgba(78,227,193,0.15)", borderRadius: 20, padding: "18px 20px", color: V.muted, fontSize: 14, marginBottom: 40 }}>
            <strong>Dossi\u00ea gerado em {fmtDateLong(selDossier.created_at)}</strong>
            <p style={{ margin: "8px 0 0" }}>Pesquisa original: {selDossier.original_research?.topic} ({fmtDate(selDossier.original_research?.created_at)}) | {selDossier.sources_analyzed} fontes analisadas + {selDossier.new_sources_found} novas</p>
          </div>
        </div>
      ) : (
        /* DOSSIER LIST */
        <div style={{ animation: "slideIn 0.4s ease" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{"\ud83d\udcda"} Dossi\u00eas de Aprofundamento</h2>
            <p style={{ color: V.muted, fontSize: 14, margin: 0 }}>Selecione uma pesquisa para gerar um dossi\u00ea aprofundado ou visualize os j\u00e1 gerados.</p>
          </div>
          {/* EXISTING DOSSIERS */}
          {dossiers.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: V.accent2, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Dossi\u00eas Gerados</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {dossiers.map((d, i) => (
                  <div key={d.id} onClick={() => d.status === "completed" && setSelDossier(d)}
                    style={{ background: V.card, border: "1px solid rgba(78,227,193,0.15)", borderRadius: 18, padding: "24px 26px", cursor: d.status === "completed" ? "pointer" : "default", transition: "all 0.3s", animation: "slideIn 0.4s ease " + (i * 0.06) + "s both" }}
                    onMouseEnter={e => { if (d.status === "completed") { (e.currentTarget as HTMLElement).style.borderColor = "rgba(78,227,193,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(78,227,193,0.15)"; (e.currentTarget as HTMLElement).style.transform = ""; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><SBadge s={d.status} /><span style={{ fontSize: 11, color: V.muted }}>{timeAgo(d.created_at)}</span></div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>{d.title}</h3>
                    <p style={{ fontSize: 12.5, color: V.muted, lineHeight: 1.6, margin: "0 0 12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{(d.executive_summary || "").replace(/[#*]/g, "").substring(0, 150)}</p>
                    <div style={{ display: "flex", gap: 14, fontSize: 11, color: V.muted }}>
                      <span>{"\ud83d\udcca"} {d.sources_analyzed}+{d.new_sources_found} fontes</span>
                      <span>{d.vertentes_covered} vertentes</span>
                      {d.status === "completed" && <span style={{ color: "#4ee3c1", fontWeight: 600 }}>Ver dossi\u00ea {"\u2192"}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* RESEARCH LIST TO GENERATE DOSSIERS */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: V.accent, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Pesquisas Dispon\u00edveis</h3>
          {research.filter(r => r.status === "completed").length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.2)" }}><div style={{ fontSize: 56, marginBottom: 16 }}>{"\ud83d\udd0d"}</div><div style={{ fontSize: 16, fontWeight: 700 }}>Nenhuma pesquisa conclu\u00edda</div></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {research.filter(r => r.status === "completed").map((r, i) => {
                const hasDossier = dossiers.find(d => d.original_research?.id === r.id);
                const isGen = genLoading === r.id;
                return <div key={r.id} style={{ background: V.card, border: "1px solid " + V.line, borderRadius: 18, padding: "24px 26px", animation: "slideIn 0.4s ease " + (i * 0.06) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: V.muted }}>{"\ud83d\udd0d"} Pesquisa | {r.sources_count} fontes</span>
                    <span style={{ fontSize: 11, color: V.muted }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{r.topic}</h3>
                  <p style={{ fontSize: 12, color: V.muted, lineHeight: 1.5, margin: "0 0 14px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{(r.executive_summary || r.summary || "").replace(/[#*]/g, "").substring(0, 120)}</p>
                  {hasDossier ? (
                    <button onClick={() => setSelDossier(hasDossier)} style={{ background: "rgba(78,227,193,0.1)", border: "1px solid rgba(78,227,193,0.3)", borderRadius: 12, padding: "10px 16px", color: "#4ee3c1", cursor: "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>Ver Dossi\u00ea {"\u2192"}</button>
                  ) : (
                    <button disabled={isGen} onClick={async () => {
                      setGenLoading(r.id);
                      try {
                        const res = await fetch("https://umwqxkggzrpwknptwwju.supabase.co/functions/v1/dossier-agent", {
                          method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3F4a2dnenJwd2tucHR3d2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzUyNjgsImV4cCI6MjA4ODM1MTI2OH0.XL7OKT0C0OlX76_mQVcHXsAVXj8cq_mkLgSVJzyH0lc" },
                          body: JSON.stringify({ report_id: r.id })
                        });
                        if (res.ok) setTimeout(fetchAll, 3000);
                      } catch (_) {} finally { setGenLoading(null); }
                    }} style={{ background: isGen ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg, " + V.accent + ", " + V.accent2 + ")", border: "none", borderRadius: 12, padding: "10px 16px", color: isGen ? V.muted : "#08101e", cursor: isGen ? "default" : "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>
                      {isGen ? "\u23f3 Gerando dossi\u00ea..." : "\ud83d\udcda Gerar Dossi\u00ea Aprofundado"}
                    </button>
                  )}
                </div>;
              })}
            </div>
          )}
        </div>
      ))}

      {/* JOBS */}
      {/* PRESENTATIONS TAB */}
      {tab === "presentations" && (selPresentation ? (
        <div style={{ animation: "slideIn 0.4s ease" }} className="presentation-view">
          <style>{`@media print { .no-print { display: none !important; } .presentation-view { padding: 0 !important; } .print-break { page-break-before: always; } }`}</style>
          <button className="no-print" onClick={() => setSelPresentation(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid " + V.line, borderRadius: 14, padding: "10px 16px", color: V.muted, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>&larr; Voltar</button>

          {/* HERO */}
          {selPresentation.hero_section && <div style={{ border: "1px solid rgba(255,200,107,0.2)", background: "linear-gradient(135deg, rgba(255,200,107,0.06), rgba(124,156,255,0.04))", borderRadius: 28, padding: "48px 40px", boxShadow: V.shadow, marginBottom: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -60, top: -60, width: 300, height: 300, borderRadius: 999, background: "radial-gradient(circle, rgba(255,200,107,0.15), transparent 65%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {(selPresentation.hero_section.badges || []).map((b: string, i: number) => <span key={i} style={{ padding: "6px 12px", borderRadius: 999, background: "rgba(255,200,107,0.12)", border: "1px solid rgba(255,200,107,0.3)", color: "#ffc86b", fontSize: 12, fontWeight: 700 }}>{b}</span>)}
              </div>
              <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.15 }}>{selPresentation.title}</h1>
              <p style={{ color: V.muted, fontSize: 17, maxWidth: 800, margin: "0 0 20px", lineHeight: 1.7 }}>{selPresentation.hero_section.summary || selPresentation.subtitle}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {selPresentation.hero_section.sources_count && <span style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid " + V.line, borderRadius: 999, color: V.muted, fontSize: 14 }}>{"\ud83d\udcca"} {selPresentation.hero_section.sources_count} fontes</span>}
                {selPresentation.hero_section.confidence && <span style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid " + V.line, borderRadius: 999, color: V.muted, fontSize: 14 }}>{selPresentation.hero_section.confidence === "alto" ? "\ud83d\udfe2" : "\ud83d\udfe1"} Confian\u00e7a: {selPresentation.hero_section.confidence}</span>}
              </div>
              <div className="no-print" style={{ marginTop: 20 }}>
                <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "12px 18px", borderRadius: 14, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg, #ffc86b, " + V.accent2 + ")", color: "#08101e" }}>{"\ud83d\udcc4"} Baixar PDF</button>
              </div>
            </div>
          </div>}

          {/* HIGHLIGHTS */}
          {selPresentation.highlights && selPresentation.highlights.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
            {selPresentation.highlights.map((h: any, i: number) => <Card key={i} style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>{h.icon || "\ud83d\udccc"}</div>
              <div style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 4px" }}>{h.value}</div>
              <div style={{ fontSize: 12, color: V.muted }}>{h.label}</div>
            </Card>)}
          </div>}

          {/* TOC */}
          {selPresentation.table_of_contents && selPresentation.table_of_contents.length > 0 && <Card className="no-print" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>{"\ud83d\udcd1"} Sum\u00e1rio</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selPresentation.table_of_contents.map((item: any, i: number) => <a key={i} href={"#" + item.id} style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid " + V.line, color: V.muted, fontSize: 13, textDecoration: "none" }}>{item.icon || ""} {item.title}</a>)}
            </div>
          </Card>}

          {/* EXECUTIVE SUMMARY */}
          {selPresentation.executive_summary && <Card style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{"\ud83d\udcdd"} Resumo Executivo</h2>
            <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(selPresentation.executive_summary) }} />
          </Card>}

          {/* DYNAMIC SECTIONS */}
          {(selPresentation.sections || []).map((sec: any, i: number) => {
            const sectionStyle = { marginBottom: 24 };
            if (sec.type === "narrative") return <Card key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || ""} {sec.title}</h2>
              <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(sec.content || "") }} />
            </Card>;

            if (sec.type === "cards") return <div key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || ""} {sec.title}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {(sec.items || []).map((item: any, j: number) => <Card key={j}>
                  {item.badge && <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "rgba(124,156,255,0.12)", color: V.accent, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{item.badge}</span>}
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{item.title}</h3>
                  <p style={{ color: V.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item.content}</p>
                </Card>)}
              </div>
            </div>;

            if (sec.type === "timeline") return <Card key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || "\u23f3"} {sec.title}</h2>
              {(sec.items || []).map((item: any, j: number) => <div key={j} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: j < (sec.items || []).length - 1 ? "1px solid " + V.line : "none" }}>
                <div style={{ minWidth: 100, color: V.accent2, fontWeight: 700, fontSize: 13 }}>{item.title || item.date}</div>
                <div><div style={{ fontWeight: 600 }}>{item.badge || item.event || ""}</div><div style={{ color: V.muted, fontSize: 13 }}>{item.content || item.detail || ""}</div></div>
              </div>)}
            </Card>;

            if (sec.type === "highlights") return <div key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || ""} {sec.title}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                {(sec.items || []).map((item: any, j: number) => <Card key={j} style={{ borderLeft: "4px solid " + V.accent2 }}>
                  <div style={{ fontWeight: 800, fontSize: 22 }}>{item.title}</div>
                  <div style={{ color: V.muted, fontSize: 13 }}>{item.content}</div>
                </Card>)}
              </div>
            </div>;

            if (sec.type === "quote") return <div key={i} id={sec.id} style={{ ...sectionStyle, padding: "24px 28px", borderLeft: "4px solid " + V.warning, background: "rgba(255,200,107,0.06)", borderRadius: 18 }}>
              <div style={{ fontSize: 32, color: V.warning, lineHeight: 1 }}>{"\u201c"}</div>
              <div style={{ fontSize: 17, fontStyle: "italic", lineHeight: 1.7, color: V.text, margin: "8px 0" }}>{sec.content}</div>
              {sec.title && <div style={{ color: V.muted, fontSize: 13 }}>\u2014 {sec.title}</div>}
            </div>;

            if (sec.type === "comparison") return <Card key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || ""} {sec.title}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {(sec.items || []).map((item: any, j: number) => <div key={j} style={{ padding: 16, borderRadius: 14, border: "1px solid " + V.line, background: "rgba(255,255,255,0.03)" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 6 }}>{item.title}</h4>
                  <p style={{ color: V.muted, fontSize: 13, margin: 0 }}>{item.content}</p>
                </div>)}
              </div>
            </Card>;

            if (sec.type === "news_panel") return <Card key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || "\ud83d\udcf0"} {sec.title}</h2>
              {(sec.items || []).map((item: any, j: number) => <div key={j} style={{ padding: "12px 0", borderBottom: "1px solid " + V.line }}>
                <div style={{ fontWeight: 600 }}>{item.url ? <a href={item.url} target="_blank" rel="noopener" style={{ color: V.accent, textDecoration: "underline" }}>{item.title} {"\u2197"}</a> : item.title}</div>
                {item.content && <div style={{ color: V.muted, fontSize: 13, marginTop: 4 }}>{item.content}</div>}
              </div>)}
            </Card>;

            if (sec.type === "table") return <Card key={i} id={sec.id} style={{ ...sectionStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid " + V.line }}><h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{sec.icon || ""} {sec.title}</h2></div>
              <div style={{ overflowX: "auto" }}>
                {(sec.items || []).map((item: any, j: number) => <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "12px 22px", borderBottom: "1px solid " + V.line }}>
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span style={{ color: V.muted }}>{item.content}</span>
                </div>)}
              </div>
            </Card>;

            // Default: narrative fallback
            return <Card key={i} id={sec.id} style={sectionStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{sec.icon || ""} {sec.title}</h2>
              <div style={{ color: V.muted, lineHeight: 1.8, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(sec.content || "") }} />
              {sec.items && sec.items.length > 0 && sec.items.map((item: any, j: number) => <div key={j} style={{ padding: "10px 0", borderBottom: "1px solid " + V.line }}><strong>{item.title}</strong><div style={{ color: V.muted, fontSize: 13 }}>{item.content}</div></div>)}
            </Card>;
          })}

          {/* SWOT */}
          <SwotSection swot={selPresentation.swot_visual} />

          {/* SOURCES */}
          {selPresentation.sources_panel && selPresentation.sources_panel.length > 0 && <Card style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{"\ud83d\udd17"} Fontes e Refer\u00eancias ({selPresentation.sources_panel.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {selPresentation.sources_panel.map((s: any, i: number) => <div key={i} style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid " + V.line, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.url ? <a href={s.url} target="_blank" rel="noopener" style={{ color: V.accent }}>{(s.title || "").substring(0, 60)} {"\u2197"}</a> : (s.title || "").substring(0, 60)}</div>
                <div style={{ color: V.muted, fontSize: 11, marginTop: 4 }}>{s.type || ""} \u2022 {s.strength || ""}</div>
              </div>)}
            </div>
          </Card>}

          {/* CONCLUSION */}
          {selPresentation.conclusion && <Card style={{ marginBottom: 24, border: "1px solid rgba(78,227,193,0.2)", background: "linear-gradient(180deg, rgba(78,227,193,0.04), rgba(255,255,255,0.03))" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px", color: V.accent2 }}>{"\u2705"} Conclus\u00e3o</h2>
            <div style={{ color: V.muted, lineHeight: 1.8, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdHtml(selPresentation.conclusion) }} />
          </Card>}

          {/* FOOTER */}
          <div style={{ background: "rgba(255,200,107,0.04)", border: "1px solid rgba(255,200,107,0.15)", borderRadius: 20, padding: "18px 20px", color: V.muted, fontSize: 14, marginBottom: 40 }}>
            <strong>Apresenta\u00e7\u00e3o gerada em {fmtDateLong(selPresentation.generated_at || selPresentation.created_at)}</strong>
            <p style={{ margin: "8px 0 0" }}>Dossi\u00ea: {selPresentation.dossier_info?.title || selPresentation.title} | {selPresentation.total_sections} se\u00e7\u00f5es | {selPresentation.total_sources} fontes | Mundo Roberth</p>
          </div>
        </div>
      ) : (
        /* PRESENTATION LIST */
        <div style={{ animation: "slideIn 0.4s ease" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{"\ud83d\udcca"} Apresenta\u00e7\u00f5es Documentais</h2>
            <p style={{ color: V.muted, fontSize: 14, margin: 0 }}>Transforme dossi\u00eas em apresenta\u00e7\u00f5es HTML interativas e exportáveis em PDF.</p>
          </div>

          {presentations.length > 0 && <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: V.warning, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Apresenta\u00e7\u00f5es Geradas</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {presentations.map((p, i) => <div key={p.id} onClick={() => p.status === "completed" && setSelPresentation(p)}
                style={{ background: V.card, border: "1px solid rgba(255,200,107,0.15)", borderRadius: 18, padding: "24px 26px", cursor: p.status === "completed" ? "pointer" : "default", transition: "all 0.3s", animation: "slideIn 0.4s ease " + (i * 0.06) + "s both" }}
                onMouseEnter={e => { if (p.status === "completed") { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,200,107,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,200,107,0.15)"; (e.currentTarget as HTMLElement).style.transform = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><SBadge s={p.status} /><span style={{ fontSize: 11, color: V.muted }}>{timeAgo(p.created_at)}</span></div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>{p.title}</h3>
                <p style={{ fontSize: 12.5, color: V.muted, lineHeight: 1.6, margin: "0 0 12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.subtitle || ""}</p>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: V.muted }}>
                  <span>{p.total_sections} se\u00e7\u00f5es</span>
                  <span>{p.total_sources} fontes</span>
                  {p.status === "completed" && <span style={{ color: "#ffc86b", fontWeight: 600 }}>Abrir {"\u2192"}</span>}
                </div>
              </div>)}
            </div>
          </div>}

          <h3 style={{ fontSize: 16, fontWeight: 700, color: V.accent2, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Dossi\u00eas Dispon\u00edveis</h3>
          {dossiers.filter(d => d.status === "completed").length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.2)" }}><div style={{ fontSize: 56, marginBottom: 16 }}>{"\ud83d\udcda"}</div><div style={{ fontSize: 16, fontWeight: 700 }}>Nenhum dossi\u00ea conclu\u00eddo</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Gere um dossi\u00ea na aba Dossi\u00eas primeiro</div></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {dossiers.filter(d => d.status === "completed").map((d, i) => {
                const hasPres = presentations.find(p => p.dossier_info?.id === d.id);
                const isGen = presLoading === d.id;
                return <div key={d.id} style={{ background: V.card, border: "1px solid " + V.line, borderRadius: 18, padding: "24px 26px", animation: "slideIn 0.4s ease " + (i * 0.06) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: V.muted }}>{"\ud83d\udcda"} Dossi\u00ea | {d.sources_analyzed} fontes</span>
                    <span style={{ fontSize: 11, color: V.muted }}>{timeAgo(d.created_at)}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{d.title}</h3>
                  <p style={{ fontSize: 12, color: V.muted, lineHeight: 1.5, margin: "0 0 14px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{(d.executive_summary || "").replace(/[#*]/g, "").substring(0, 120)}</p>
                  {hasPres ? (
                    <button onClick={() => setSelPresentation(hasPres)} style={{ background: "rgba(255,200,107,0.1)", border: "1px solid rgba(255,200,107,0.3)", borderRadius: 12, padding: "10px 16px", color: "#ffc86b", cursor: "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>Ver Apresenta\u00e7\u00e3o {"\u2192"}</button>
                  ) : (
                    <button disabled={isGen} onClick={async () => {
                      setPresLoading(d.id);
                      try {
                        await fetch("https://umwqxkggzrpwknptwwju.supabase.co/functions/v1/presentation-agent", {
                          method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3F4a2dnenJwd2tucHR3d2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzUyNjgsImV4cCI6MjA4ODM1MTI2OH0.XL7OKT0C0OlX76_mQVcHXsAVXj8cq_mkLgSVJzyH0lc" },
                          body: JSON.stringify({ dossier_id: d.id })
                        });
                        setTimeout(fetchAll, 3000);
                      } catch (_) {} finally { setPresLoading(null); }
                    }} style={{ background: isGen ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg, #ffc86b, " + V.accent2 + ")", border: "none", borderRadius: 12, padding: "10px 16px", color: isGen ? V.muted : "#08101e", cursor: isGen ? "default" : "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>
                      {isGen ? "\u23f3 Gerando apresenta\u00e7\u00e3o..." : "\ud83d\udcca Gerar Apresenta\u00e7\u00e3o HTML"}
                    </button>
                  )}
                </div>;
              })}
            </div>
          )}
        </div>
      ))}

      {tab === "jobs" && <GPanel title={"Jobs (" + jobs.length + ")"} icon="\ud83d\udd04" full><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["Status", "Mensagem", "Inten\u00e7\u00e3o", "A\u00e7\u00e3o", "Confian\u00e7a", "Data"].map(h => <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>)}</tr></thead><tbody>{jobs.map((j, i) => <tr key={j.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", animation: "slideIn 0.3s ease " + (i * 0.03) + "s both" }}><td style={{ padding: "10px 8px" }}><SBadge s={j.status} /></td><td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.6)", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.user_message ? String(j.user_message).replace(/"/g, "") : "\u2014"}</td><td style={{ padding: "10px 8px", color: "rgba(124,156,255,0.8)", fontWeight: 600 }}>{j.intent || "\u2014"}</td><td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.5)" }}>{j.action || "\u2014"}</td><td style={{ padding: "10px 8px" }}>{j.confidence ? <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{Math.round(parseFloat(j.confidence) * 100)}%</span> : "\u2014"}</td><td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{fmtDate(j.created_at)}</td></tr>)}</tbody></table></div></GPanel>}

      {/* TASKS */}
      {tab === "tasks" && <GPanel title={"Tarefas (" + tasks.length + ")"} icon="\ud83d\udccb" full>{!tasks.length ? <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>Nenhuma tarefa</div> : tasks.map((t, i) => <div key={t.id} style={{ padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t.title}</div>{t.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{t.description}</div>}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{t.due_at ? "Prazo: " + fmtDate(t.due_at) : ""}</div></div><SBadge s={t.status} /></div>)}</GPanel>}

      {/* CALENDAR */}
      {tab === "calendar" && <GPanel title={"Eventos (" + events.length + ")"} icon="\ud83d\udcc5" full>{!events.length ? <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>Nenhum evento</div> : events.map((e, i) => <div key={e.id} style={{ padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 14, animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}><div style={{ minWidth: 50, textAlign: "center", padding: "8px 6px", borderRadius: 10, background: "rgba(124,156,255,0.1)", border: "1px solid rgba(124,156,255,0.2)" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#7c9cff" }}>{new Date(e.start_at).getDate()}</div><div style={{ fontSize: 10, color: "rgba(124,156,255,0.6)", fontWeight: 700, textTransform: "uppercase" }}>{new Date(e.start_at).toLocaleString("pt-BR", { month: "short" })}</div></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{e.title}</div>{e.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{e.description}</div>}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{e.all_day ? "Dia inteiro" : fmtDate(e.start_at)}</div></div><SBadge s={e.status} /></div>)}</GPanel>}

      {/* AUDIT */}
      {tab === "audit" && <GPanel title={"Auditoria (" + audit.length + ")"} icon="\ud83d\udd0e" full>{audit.map((a, i) => <div key={a.id} style={{ padding: "10px 8px", borderLeft: "3px solid " + (stColors[a.status] || stColors.pending).text, marginLeft: 8, animation: "slideIn 0.3s ease " + (i * 0.03) + "s both", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", borderRadius: "0 8px 8px 0" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><SBadge s={a.status} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>{fmtDate(a.created_at)}</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{a.message}</div></div>)}</GPanel>}
    </main>

    <footer className="no-print" style={{ position: "relative", zIndex: 10, padding: "16px 32px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Mundo Roberth 0.4 \u00b7 Supabase + Telegram + OpenAI \u00b7 Auto-refresh 10s</span>
    </footer>
  </div>;
}
