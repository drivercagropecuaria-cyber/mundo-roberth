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
interface CalendarEvent { id: string; title: string; description: string|null; start_at: string; end_at: string|null; all_day: boolean; status: string; created_at: string; }
interface AuditEvent { id: string; status: string; message: string; created_at: string; }
interface ResearchSource { title: string; url: string; source_platform: string; relevance_score: number; upvotes: number; comments_count: number; author: string; content_snippet: string; }
interface ResearchReport { id: string; topic: string; summary: string|null; full_report: string|null; sources_count: number; status: string; created_at: string; sources: ResearchSource[]|null; }

// ============================================================
// HELPERS
// ============================================================
function formatDate(iso: string|null) { if (!iso) return "\u2014"; return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function timeAgo(iso: string|null) { if (!iso) return ""; const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return "agora"; if (m < 60) return m + "min"; const h = Math.floor(m / 60); if (h < 24) return h + "h"; return Math.floor(h / 24) + "d"; }

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  running: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  completed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  researching: { bg: "rgba(168,85,247,0.15)", text: "#a855f7", border: "rgba(168,85,247,0.3)" },
  failed: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  confirmed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  cancelled: { bg: "rgba(107,114,128,0.15)", text: "#6b7280", border: "rgba(107,114,128,0.3)" },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusColors[status] || statusColors.pending;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, background: c.bg, color: c.text, border: "1px solid " + c.border }}>{status}</span>;
}
function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: accent, filter: "blur(25px)" }} />
      <div style={{ fontSize: 22, opacity: 0.7 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.5, fontFamily: "'DM Mono', monospace", background: "linear-gradient(135deg, #fff 0%, " + accent.replace("0.08", "0.9") + " 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
    </div>
  );
}
function GlassPanel({ title, icon, children, fullHeight = false }: { title: string; icon: string; children: React.ReactNode; fullHeight?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
      </div>
      <div style={{ padding: "12px 18px", maxHeight: fullHeight ? "none" : 360, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ============================================================
// MARKDOWN TO HTML (simple converter)
// ============================================================
function mdToHtml(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/^### (.*$)/gm, '<h3 style="font-size:16px;font-weight:700;color:#c4b5fd;margin:20px 0 8px;font-family:\'Outfit\',sans-serif">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:20px;font-weight:800;color:#e0d4fc;margin:28px 0 12px;border-bottom:1px solid rgba(139,92,246,0.15);padding-bottom:8px;font-family:\'Outfit\',sans-serif">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-size:26px;font-weight:900;color:#fff;margin:32px 0 14px;font-family:\'Outfit\',sans-serif">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e0d4fc;font-weight:700">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:rgba(255,255,255,0.7)">$1</em>')
    .replace(/^- (.*$)/gm, '<div style="display:flex;gap:8px;margin:4px 0 4px 12px;line-height:1.6"><span style="color:#8b5cf6;font-weight:700">&#x2022;</span><span>$1</span></div>')
    .replace(/^\d+\. (.*$)/gm, '<div style="display:flex;gap:8px;margin:4px 0 4px 12px;line-height:1.6"><span style="color:#8b5cf6;font-weight:700;min-width:18px">&#x2023;</span><span>$1</span></div>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:underline;text-underline-offset:3px;transition:color 0.2s" onmouseover="this.style.color=\'#c4b5fd\'" onmouseout="this.style.color=\'#a78bfa\'">$1 &#x2197;</a>');
  // Wrap loose text lines in paragraphs
  html = html.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<div style="height:8px"></div>';
    if (trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<a")) return trimmed;
    return '<p style="line-height:1.75;margin:6px 0;color:rgba(255,255,255,0.72)">' + trimmed + '</p>';
  }).join("\n");
  return html;
}

// ============================================================
// RESEARCH DOCUMENT VIEWER
// ============================================================
function ResearchDocument({ report, onBack }: { report: ResearchReport; onBack: () => void }) {
  const dateStr = new Date(report.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const sources = report.sources || [];
  const redditSources = sources.filter(s => s.source_platform === "reddit");
  const webSources = sources.filter(s => s.source_platform !== "reddit");

  return (
    <div style={{ animation: "slideIn 0.4s ease" }}>
      {/* Back button */}
      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
        <span style={{ fontSize: 16 }}>&larr;</span> Voltar para pesquisas
      </button>

      {/* Document container */}
      <div style={{ background: "linear-gradient(135deg, rgba(15,12,25,0.95) 0%, rgba(20,15,35,0.98) 100%)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(139,92,246,0.05)" }}>

        {/* Document Header */}
        <div style={{ padding: "40px 48px 32px", background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 100%)", borderBottom: "1px solid rgba(139,92,246,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <StatusBadge status={report.status} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>ID: {report.id.substring(0, 8)}</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.3, fontFamily: "'Outfit', sans-serif", letterSpacing: -0.5 }}>
              {report.topic}
            </h1>
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                <span>&#x1F4C5;</span> {dateStr}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                <span>&#x1F4CA;</span> {report.sources_count} fontes consultadas
              </div>
              {redditSources.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ff6314" }}>
                  <span>&#x1F916;</span> {redditSources.length} do Reddit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sources Section */}
        {sources.length > 0 && (
          <div style={{ padding: "28px 48px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16, fontFamily: "'Outfit', sans-serif" }}>
              &#x1F517; Fontes &amp; Artigos ({sources.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {sources.map((s, i) => (
                <a key={i} href={s.url || "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", transition: "all 0.25s ease", cursor: s.url ? "pointer" : "default" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.05)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, background: s.source_platform === "reddit" ? "rgba(255,99,20,0.12)" : "rgba(59,130,246,0.12)", color: s.source_platform === "reddit" ? "#ff6314" : "#3b82f6", border: "1px solid " + (s.source_platform === "reddit" ? "rgba(255,99,20,0.2)" : "rgba(59,130,246,0.2)"), fontFamily: "'DM Mono', monospace" }}>
                      {s.source_platform === "reddit" ? "R" : "W"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                        {s.title}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: s.source_platform === "reddit" ? "rgba(255,99,20,0.1)" : "rgba(59,130,246,0.1)", color: s.source_platform === "reddit" ? "#ff6314" : "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {s.source_platform}
                        </span>
                        {s.relevance_score > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)" }}>
                              <div style={{ width: (s.relevance_score * 100) + "%", height: "100%", borderRadius: 2, background: s.relevance_score > 0.7 ? "#22c55e" : "#fbbf24" }} />
                            </div>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{Math.round(s.relevance_score * 100)}%</span>
                          </div>
                        )}
                        {s.author && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{s.author}</span>}
                      </div>
                    </div>
                    {s.url && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>&#x2197;</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Full Report Rendered as HTML Document */}
        <div style={{ padding: "40px 48px 48px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
            &#x1F4C4; Relat&oacute;rio Completo
          </h2>
          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "36px 40px", fontSize: 14.5, lineHeight: 1.8, color: "rgba(255,255,255,0.72)", fontFamily: "'Source Serif 4', Georgia, serif" }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(report.full_report || report.summary || "Relat\u00f3rio n\u00e3o dispon\u00edvel.") }}
          />
        </div>

        {/* Document Footer */}
        <div style={{ padding: "20px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>
            Mundo Roberth 0.1 &mdash; Agente de Pesquisa
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            {dateStr}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RESEARCH LIST VIEW
// ============================================================
function ResearchList({ reports, onSelect }: { reports: ResearchReport[]; onSelect: (r: ResearchReport) => void }) {
  if (reports.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#x1F50D;</div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Nenhuma pesquisa realizada</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
          Envie uma mensagem como &quot;Pesquisar sobre intelig&ecirc;ncia artificial na agricultura&quot; para o bot no Telegram
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
      {reports.map((r, i) => (
        <div key={r.id} onClick={() => r.status === "completed" && onSelect(r)}
          style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "24px 26px",
            cursor: r.status === "completed" ? "pointer" : "default", transition: "all 0.3s ease", position: "relative", overflow: "hidden",
            animation: "slideIn 0.4s ease " + (i * 0.06) + "s both",
          }}
          onMouseEnter={e => { if (r.status === "completed") { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.25)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(139,92,246,0.08)"; }}}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
        >
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: r.status === "completed" ? "rgba(139,92,246,0.06)" : "rgba(239,68,68,0.04)", filter: "blur(30px)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <StatusBadge status={r.status} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{timeAgo(r.created_at)}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.9)", margin: "0 0 8px", lineHeight: 1.35, fontFamily: "'Outfit', sans-serif" }}>
              {r.topic}
            </h3>
            {r.summary && (
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {r.summary.replace(/[#*]/g, "").substring(0, 200)}
              </p>
            )}
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>&#x1F4CA;</span> {r.sources_count} fontes
              </span>
              {r.status === "completed" && (
                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>
                  Abrir relat&oacute;rio &rarr;
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TABS
// ============================================================
const tabs = [
  { id: "overview", label: "Vis\u00e3o Geral", icon: "\u26a1" },
  { id: "research", label: "Pesquisas", icon: "\ud83d\udd0d" },
  { id: "jobs", label: "Jobs", icon: "\ud83d\udd04" },
  { id: "tasks", label: "Tarefas", icon: "\ud83d\udccb" },
  { id: "calendar", label: "Calend\u00e1rio", icon: "\ud83d\udcc5" },
  { id: "audit", label: "Auditoria", icon: "\ud83d\udd0d" },
];

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [research, setResearch] = useState<ResearchReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setPulse(true);
      const [s, j, t, e, a, r] = await Promise.all([
        rpc<DashboardStats>("get_dashboard_stats"),
        rpc<Job[]>("get_recent_jobs", { p_limit: 20 }),
        rpc<Task[]>("get_all_tasks"),
        rpc<CalendarEvent[]>("get_all_calendar_events"),
        rpc<AuditEvent[]>("get_recent_events", { p_limit: 30 }),
        rpc<ResearchReport[]>("get_all_research_reports"),
      ]);
      setStats(s); setJobs(j || []); setTasks(t || []); setEvents(e || []); setAudit(a || []); setResearch(r || []);
      setLastUpdate(new Date()); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro"); }
    finally { setLoading(false); setTimeout(() => setPulse(false), 600); }
  }, []);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 10000); return () => clearInterval(iv); }, [fetchAll]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Conectando ao Mundo Roberth...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", color: "#fff", background: "#09090b", position: "relative", overflow: "hidden", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
        @keyframes slideIn { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform: translateY(0) } }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px }
        * { box-sizing: border-box; margin: 0; padding: 0 }
      `}</style>
      <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", animation: "float 20s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, right: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", animation: "float 25s ease-in-out infinite reverse", pointerEvents: "none" }} />

      {/* HEADER */}
      <header style={{ position: "relative", zIndex: 10, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>&#x1F30D;</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>MUNDO ROBERTH</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Dashboard v0.2</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)", animation: pulse ? "pulse-glow 0.6s ease" : "none" }} />
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{lastUpdate ? timeAgo(lastUpdate.toISOString()) : ""}</div>
          <button onClick={fetchAll} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>&orarr; Refresh</button>
        </div>
      </header>

      {/* NAV */}
      <nav style={{ position: "relative", zIndex: 10, padding: "0 32px", display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.04)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedReport(null); }} style={{ padding: "14px 18px", background: "none", border: "none", cursor: "pointer", color: tab === t.id ? "#fff" : "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: tab === t.id ? 700 : 500, borderBottom: tab === t.id ? "2px solid #8b5cf6" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "'Outfit', sans-serif" }}>
            <span>{t.icon}</span> {t.label}
            {t.id === "research" && research.length > 0 && (
              <span style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 10, marginLeft: 2 }}>{research.length}</span>
            )}
          </button>
        ))}
      </nav>

      {error && <div style={{ margin: "16px 32px", padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{error}</div>}

      {/* CONTENT */}
      <main style={{ position: "relative", zIndex: 10, padding: "24px 32px", animation: "slideIn 0.3s ease" }}>

        {/* OVERVIEW */}
        {tab === "overview" && stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
              <StatCard label="Usu\u00e1rios" value={stats.total_users} icon="&#x1F464;" accent="rgba(139,92,246,0.08)" />
              <StatCard label="Comandos" value={stats.total_commands} icon="&#x1F4AC;" accent="rgba(59,130,246,0.08)" />
              <StatCard label="Conclu\u00eddos" value={stats.jobs_completed} icon="&#x2705;" accent="rgba(34,197,94,0.08)" />
              <StatCard label="Pesquisas" value={stats.total_research || 0} icon="&#x1F50D;" accent="rgba(168,85,247,0.08)" />
              <StatCard label="Tarefas" value={stats.total_tasks} icon="&#x1F4CB;" accent="rgba(251,191,36,0.08)" />
              <StatCard label="Fontes" value={stats.total_sources || 0} icon="&#x1F517;" accent="rgba(236,72,153,0.08)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <GlassPanel title="\u00daltimos Jobs" icon="&#x1F504;">
                {jobs.slice(0, 8).map((j, i) => (
                  <div key={j.id} style={{ padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.user_message ? String(j.user_message).replace(/"/g, "") : "\u2014"}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{j.user_name || "?"} &middot; {j.intent || "..."} &middot; {timeAgo(j.created_at)}</div>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                ))}
              </GlassPanel>
              <GlassPanel title="Trilha de Auditoria" icon="&#x1F50D;">
                {audit.slice(0, 10).map((a, i) => (
                  <div key={a.id} style={{ padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", animation: "slideIn 0.3s ease " + (i * 0.04) + "s both" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><StatusBadge status={a.status} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(a.created_at)}</span></div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.message}</div>
                  </div>
                ))}
              </GlassPanel>
            </div>
          </div>
        )}

        {/* RESEARCH */}
        {tab === "research" && (
          selectedReport
            ? <ResearchDocument report={selectedReport} onBack={() => setSelectedReport(null)} />
            : <ResearchList reports={research} onSelect={setSelectedReport} />
        )}

        {/* JOBS */}
        {tab === "jobs" && (
          <GlassPanel title={"Jobs (" + jobs.length + ")"} icon="&#x1F504;" fullHeight>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Status", "Usu\u00e1rio", "Mensagem", "Inten\u00e7\u00e3o", "A\u00e7\u00e3o", "Confian\u00e7a", "Data"].map(h => (
                    <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{jobs.map((j, i) => (
                  <tr key={j.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", animation: "slideIn 0.3s ease " + (i * 0.03) + "s both" }}>
                    <td style={{ padding: "10px 8px" }}><StatusBadge status={j.status} /></td>
                    <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.7)" }}>{j.user_name || "\u2014"}</td>
                    <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.6)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.user_message ? String(j.user_message).replace(/"/g, "") : "\u2014"}</td>
                    <td style={{ padding: "10px 8px", color: "rgba(139,92,246,0.8)", fontWeight: 600 }}>{j.intent || "\u2014"}</td>
                    <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.5)" }}>{j.action || "\u2014"}</td>
                    <td style={{ padding: "10px 8px" }}>{j.confidence ? (<div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }}><div style={{ width: (parseFloat(j.confidence) * 100) + "%", height: "100%", borderRadius: 2, background: parseFloat(j.confidence) > 0.7 ? "#22c55e" : "#fbbf24" }} /></div><span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{Math.round(parseFloat(j.confidence) * 100)}%</span></div>) : "\u2014"}</td>
                    <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{formatDate(j.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </GlassPanel>
        )}

        {/* TASKS */}
        {tab === "tasks" && (
          <GlassPanel title={"Tarefas (" + tasks.length + ")"} icon="&#x1F4CB;" fullHeight>
            {tasks.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}><div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F4CB;</div><div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma tarefa</div></div>
            : tasks.map((t, i) => (
              <div key={t.id} style={{ padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{t.description}</div>}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{t.due_at ? "Prazo: " + formatDate(t.due_at) : ""} &middot; {timeAgo(t.created_at)}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </GlassPanel>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <GlassPanel title={"Eventos (" + events.length + ")"} icon="&#x1F4C5;" fullHeight>
            {events.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}><div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F4C5;</div><div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum evento</div></div>
            : events.map((e, i) => (
              <div key={e.id} style={{ padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 14, animation: "slideIn 0.3s ease " + (i * 0.05) + "s both" }}>
                <div style={{ minWidth: 50, textAlign: "center", padding: "8px 6px", borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>{new Date(e.start_at).getDate()}</div>
                  <div style={{ fontSize: 10, color: "rgba(139,92,246,0.6)", fontWeight: 700, textTransform: "uppercase" }}>{new Date(e.start_at).toLocaleString("pt-BR", { month: "short" })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{e.title}</div>
                  {e.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{e.description}</div>}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{e.all_day ? "Dia inteiro" : formatDate(e.start_at) + (e.end_at ? " \u2192 " + formatDate(e.end_at) : "")}</div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </GlassPanel>
        )}

        {/* AUDIT */}
        {tab === "audit" && (
          <GlassPanel title={"Auditoria (" + audit.length + ")"} icon="&#x1F50D;" fullHeight>
            {audit.map((a, i) => (
              <div key={a.id} style={{ padding: "10px 8px", borderLeft: "3px solid " + (statusColors[a.status] || statusColors.pending).text, marginLeft: 8, animation: "slideIn 0.3s ease " + (i * 0.03) + "s both", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", borderRadius: "0 8px 8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <StatusBadge status={a.status} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>{formatDate(a.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{a.message}</div>
              </div>
            ))}
          </GlassPanel>
        )}
      </main>

      <footer style={{ position: "relative", zIndex: 10, padding: "16px 32px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 500 }}>Mundo Roberth 0.2 &middot; Supabase + Telegram + OpenAI &middot; Auto-refresh 10s</span>
      </footer>
    </div>
  );
}
