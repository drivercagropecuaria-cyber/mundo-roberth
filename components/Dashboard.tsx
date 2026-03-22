"use client";

import { useState, useEffect, useCallback } from "react";
import { rpc } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

interface DashboardStats {
  total_users: number;
  total_commands: number;
  jobs_pending: number;
  jobs_running: number;
  jobs_completed: number;
  jobs_failed: number;
  total_tasks: number;
  tasks_pending: number;
  tasks_completed: number;
  total_events: number;
  events_confirmed: number;
}

interface Job {
  id: string;
  status: string;
  chat_id: number;
  intent: string | null;
  action: string | null;
  confidence: string | null;
  user_message: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  status: string;
  created_at: string;
}

interface AuditEvent {
  id: string;
  status: string;
  message: string;
  created_at: string;
  chat_id: number;
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  running: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  completed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  failed: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  confirmed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  tentative: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  cancelled: { bg: "rgba(107,114,128,0.15)", text: "#6b7280", border: "rgba(107,114,128,0.3)" },
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const c = statusColors[status] || statusColors.pending;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>{status}</span>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%", background: accent, filter: "blur(25px)",
      }} />
      <div style={{ fontSize: 22, opacity: 0.7 }}>{icon}</div>
      <div style={{
        fontSize: 32, fontWeight: 800, letterSpacing: -1.5,
        fontFamily: "'JetBrains Mono', monospace",
        background: `linear-gradient(135deg, #fff 0%, ${accent.replace("0.08", "0.9")} 100%)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
    </div>
  );
}

function GlassPanel({ title, icon, children, fullHeight = false }: { title: string; icon: string; children: React.ReactNode; fullHeight?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
      </div>
      <div style={{ padding: "12px 18px", maxHeight: fullHeight ? "none" : 360, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ============================================================
// TABS
// ============================================================

const tabs = [
  { id: "overview", label: "Visão Geral", icon: "⚡" },
  { id: "jobs", label: "Jobs", icon: "🔄" },
  { id: "tasks", label: "Tarefas", icon: "📋" },
  { id: "calendar", label: "Calendário", icon: "📅" },
  { id: "audit", label: "Auditoria", icon: "🔍" },
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
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setPulse(true);
      const [s, j, t, e, a] = await Promise.all([
        rpc<DashboardStats>("get_dashboard_stats"),
        rpc<Job[]>("get_recent_jobs", { p_limit: 20 }),
        rpc<Task[]>("get_all_tasks"),
        rpc<CalendarEvent[]>("get_all_calendar_events"),
        rpc<AuditEvent[]>("get_recent_events", { p_limit: 30 }),
      ]);
      setStats(s);
      setJobs(j || []);
      setTasks(t || []);
      setEvents(e || []);
      setAudit(a || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
      setTimeout(() => setPulse(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // LOADING
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Conectando ao Mundo Roberth...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", color: "#fff", background: "#09090b", position: "relative", overflow: "hidden" }}>
      {/* BG Effects */}
      <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", animation: "float 20s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, right: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", animation: "float 25s ease-in-out infinite reverse", pointerEvents: "none" }} />

      {/* HEADER */}
      <header style={{ position: "relative", zIndex: 10, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 0 30px rgba(139,92,246,0.3)",
          }}>🌍</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>MUNDO ROBERTH</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Dashboard v0.1</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 20,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.6)",
              animation: pulse ? "pulse-glow 0.6s ease" : "none",
            }} />
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {lastUpdate ? `Atualizado ${timeAgo(lastUpdate.toISOString())}` : ""}
          </div>
          <button onClick={fetchAll} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>↻ Refresh</button>
        </div>
      </header>

      {/* NAV */}
      <nav style={{ position: "relative", zIndex: 10, padding: "0 32px", display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.04)", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "#fff" : "rgba(255,255,255,0.35)",
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            borderBottom: tab === t.id ? "2px solid #8b5cf6" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {/* ERROR */}
      {error && (
        <div style={{ margin: "16px 32px", padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
          ⚠️ Erro: {error}
        </div>
      )}

      {/* CONTENT */}
      <main style={{ position: "relative", zIndex: 10, padding: "24px 32px", animation: "slideIn 0.3s ease" }}>

        {/* OVERVIEW */}
        {tab === "overview" && stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <StatCard label="Usuários" value={stats.total_users} icon="👤" accent="rgba(139,92,246,0.08)" />
              <StatCard label="Comandos" value={stats.total_commands} icon="💬" accent="rgba(59,130,246,0.08)" />
              <StatCard label="Concluídos" value={stats.jobs_completed} icon="✅" accent="rgba(34,197,94,0.08)" />
              <StatCard label="Falhas" value={stats.jobs_failed} icon="❌" accent="rgba(239,68,68,0.08)" />
              <StatCard label="Tarefas" value={stats.total_tasks} icon="📋" accent="rgba(251,191,36,0.08)" />
              <StatCard label="Eventos" value={stats.total_events} icon="📅" accent="rgba(236,72,153,0.08)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <GlassPanel title="Últimos Jobs" icon="🔄">
                {jobs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Nenhum job ainda</div>
                ) : jobs.slice(0, 8).map((j, i) => (
                  <div key={j.id} style={{
                    padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    animation: `slideIn 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.user_message ? String(j.user_message).replace(/"/g, "") : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {j.user_name || "?"} · {j.intent || "processando..."} · {timeAgo(j.created_at)}
                      </div>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                ))}
              </GlassPanel>
              <GlassPanel title="Trilha de Auditoria" icon="🔍">
                {audit.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Nenhum evento</div>
                ) : audit.slice(0, 10).map((a, i) => (
                  <div key={a.id} style={{
                    padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    animation: `slideIn 0.3s ease ${i * 0.04}s both`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusBadge status={a.status} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(a.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.message}
                    </div>
                  </div>
                ))}
              </GlassPanel>
            </div>
          </div>
        )}

        {/* JOBS */}
        {tab === "jobs" && (
          <GlassPanel title={`Jobs (${jobs.length})`} icon="🔄" fullHeight>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Status", "Usuário", "Mensagem", "Intenção", "Ação", "Confiança", "Data"].map(h => (
                      <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, i) => (
                    <tr key={j.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", animation: `slideIn 0.3s ease ${i * 0.03}s both` }}>
                      <td style={{ padding: "10px 8px" }}><StatusBadge status={j.status} /></td>
                      <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.7)" }}>{j.user_name || "—"}</td>
                      <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.6)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.user_message ? String(j.user_message).replace(/"/g, "") : "—"}
                      </td>
                      <td style={{ padding: "10px 8px", color: "rgba(139,92,246,0.8)", fontWeight: 600 }}>{j.intent || "—"}</td>
                      <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.5)" }}>{j.action || "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        {j.confidence ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }}>
                              <div style={{ width: `${parseFloat(j.confidence) * 100}%`, height: "100%", borderRadius: 2, background: parseFloat(j.confidence) > 0.7 ? "#22c55e" : "#fbbf24" }} />
                            </div>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{Math.round(parseFloat(j.confidence) * 100)}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 8px", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{formatDate(j.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobs.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>Nenhum job registrado</div>}
            </div>
          </GlassPanel>
        )}

        {/* TASKS */}
        {tab === "tasks" && (
          <GlassPanel title={`Tarefas (${tasks.length})`} icon="📋" fullHeight>
            {tasks.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma tarefa ainda</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Mande algo como &quot;Criar tarefa: revisar documentos&quot; pro bot</div>
              </div>
            ) : tasks.map((t, i) => (
              <div key={t.id} style={{
                padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                animation: `slideIn 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{t.description}</div>}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                    {t.due_at ? `⏰ Prazo: ${formatDate(t.due_at)}` : ""} · Criada {timeAgo(t.created_at)}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </GlassPanel>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <GlassPanel title={`Eventos (${events.length})`} icon="📅" fullHeight>
            {events.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum evento agendado</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Mande algo como &quot;Agendar reunião amanhã às 14h&quot; pro bot</div>
              </div>
            ) : events.map((e, i) => (
              <div key={e.id} style={{
                padding: "14px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", gap: 14, alignItems: "flex-start",
                animation: `slideIn 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{
                  minWidth: 50, textAlign: "center", padding: "8px 6px",
                  borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>
                    {new Date(e.start_at).getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(139,92,246,0.6)", fontWeight: 700, textTransform: "uppercase" }}>
                    {new Date(e.start_at).toLocaleString("pt-BR", { month: "short" })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{e.title}</div>
                  {e.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{e.description}</div>}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                    {e.all_day ? "Dia inteiro" : `${formatDate(e.start_at)}${e.end_at ? ` → ${formatDate(e.end_at)}` : ""}`}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </GlassPanel>
        )}

        {/* AUDIT */}
        {tab === "audit" && (
          <GlassPanel title={`Eventos de Auditoria (${audit.length})`} icon="🔍" fullHeight>
            {audit.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>Nenhum evento de auditoria</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {audit.map((a, i) => (
                  <div key={a.id} style={{
                    padding: "10px 8px", borderLeft: `3px solid ${(statusColors[a.status] || statusColors.pending).text}`,
                    marginLeft: 8, animation: `slideIn 0.3s ease ${i * 0.03}s both`,
                    background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    borderRadius: "0 8px 8px 0",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <StatusBadge status={a.status} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(a.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{a.message}</div>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 10, padding: "16px 32px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 500 }}>
          Mundo Roberth 0.1 · Supabase + Telegram + OpenAI · Auto-refresh 10s
        </span>
      </footer>
    </div>
  );
}
