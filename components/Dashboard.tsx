"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient("https://umwqxkggzrpwknptwwju.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3F4a2dnenJwd2tucHR3d2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzUyNjgsImV4cCI6MjA4ODM1MTI2OH0.XL7OKT0C0OlX76_mQVcHXsAVXj8cq_mkLgSVJzyH0lc");
async function rpc<T>(fn:string,p:any={}):Promise<T>{const{data,error}=await sb.rpc(fn,p);if(error)throw new Error(`RPC ${fn}: ${error.message}`);return data as T;}

// === TYPES ===
interface Stats{total_users:number;total_commands:number;jobs_pending:number;jobs_running:number;jobs_completed:number;jobs_failed:number;total_tasks:number;tasks_pending:number;tasks_completed:number;total_events:number;events_confirmed:number;total_research:number;research_completed:number;total_sources:number;total_academic_sources:number;total_directives:number;total_dossiers:number;total_presentations:number;avg_quality:number;total_conflicts:number;total_notifications:number;avg_sources_per_research:number;memory_entries:number;traces:number;success_rate:number;total_evidence?:number;total_branches?:number;branches_completed?:number;quality_gates_passed?:number;studio_outputs?:number;}
interface Job{id:string;status:string;intent:string|null;action:string|null;confidence:string|null;user_message:string|null;created_at:string;quality_score?:number;agent_version?:string;}
interface Task{id:string;title:string;description:string|null;status:string;due_at:string|null;created_at:string;}
interface CalEvent{id:string;title:string;description:string|null;start_at:string;end_at:string|null;all_day:boolean;status:string;created_at:string;}
interface AuditEvent{id:string;status:string;message:string;created_at:string;}
interface RReport{id:string;topic:string;summary:string|null;executive_summary:string|null;main_answer:string|null;full_report:string|null;sources_count:number;status:string;mode:string|null;confidence:string|null;search_contract:any;self_evaluation:any;created_at:string;sources:any[]|null;conflict_details:any[]|null;swot_analysis?:any;source_tiers?:any;thought_tree?:any;search_rounds?:number;coverage_score?:any;metadata?:any;branches?:any[];evidence_count?:number;}
interface DossierData{id:string;title:string;status:string;executive_summary:string|null;overview:string|null;context_history:string|null;current_state:string|null;detailed_analysis:string|null;perspectives:any;key_findings:any;convergences:any;divergences:any;gaps_limitations:string|null;practical_implications:string|null;strategic_dimensions:string|null;future_trends:string|null;conclusion:string|null;confidence:string|null;confidence_why:string|null;sources_analyzed:number;new_sources_found:number;vertentes_covered:number;coverage_score:any;processing_log:any;swot_analysis?:any;metadata?:any;created_at:string;updated_at:string;original_research:any;original_sources:any;new_sources:any[];}
interface PresentData{id:string;title:string;subtitle:string|null;status:string;hero_section:any;table_of_contents:any;executive_summary:string|null;sections:any[];highlights:any[];sources_panel:any[];conclusion:string|null;footer_meta:any;swot_visual:any;total_sections:number;total_sources:number;theme:string;generated_at:string|null;created_at:string;dossier_info:any;}

// === HELPERS ===
function fmt(d:string|null){return d?new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";}
function ago(d:string|null){if(!d)return"";const m=Math.floor((Date.now()-new Date(d).getTime())/6e4);if(m<1)return"agora";if(m<60)return m+"min";const h=Math.floor(m/60);return h<24?h+"h":Math.floor(h/24)+"d";}
function md2html(t:string|null){if(!t)return"";return t.replace(/^### (.*$)/gm,'<h3 style="font-size:15px;font-weight:700;color:#7c9cff;margin:16px 0 6px">$1</h3>').replace(/^## (.*$)/gm,'<h2 style="font-size:18px;font-weight:800;color:#dce5ff;margin:22px 0 10px;border-bottom:1px solid rgba(124,156,255,0.12);padding-bottom:6px">$1</h2>').replace(/^# (.*$)/gm,'<h1 style="font-size:24px;font-weight:900;color:#eef2ff;margin:28px 0 12px">$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong style="color:#dce5ff">$1</strong>').replace(/\*(.*?)\*/g,'<em style="color:#aab4d6">$1</em>').replace(/^- (.*$)/gm,'<div style="display:flex;gap:8px;margin:3px 0 3px 10px;line-height:1.6"><span style="color:#7c9cff">•</span><span>$1</span></div>').replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:#7c9cff;text-decoration:underline">$1 ↗</a>').split("\n").map(l=>{const s=l.trim();return s?s.startsWith("<")?s:'<p style="line-height:1.7;margin:4px 0;color:#aab4d6">'+s+"</p>":'<div style="height:4px"></div>';}).join("\n");}

// === THEME ===
const V={card:"rgba(255,255,255,0.05)",text:"#eef2ff",muted:"#8896b8",line:"rgba(255,255,255,0.08)",accent:"#7c9cff",accent2:"#4ee3c1",danger:"#ff7d7d",warning:"#ffc86b",success:"#6fe2a3",shadow:"0 12px 40px rgba(0,0,0,0.3)",radius:18};
const ST:Record<string,{bg:string;text:string;border:string}>={pending:{bg:"rgba(251,191,36,0.12)",text:"#fbbf24",border:"rgba(251,191,36,0.25)"},running:{bg:"rgba(59,130,246,0.12)",text:"#3b82f6",border:"rgba(59,130,246,0.25)"},completed:{bg:"rgba(34,197,94,0.12)",text:"#22c55e",border:"rgba(34,197,94,0.25)"},researching:{bg:"rgba(168,85,247,0.12)",text:"#a855f7",border:"rgba(168,85,247,0.25)"},failed:{bg:"rgba(239,68,68,0.12)",text:"#ef4444",border:"rgba(239,68,68,0.25)"},confirmed:{bg:"rgba(34,197,94,0.12)",text:"#22c55e",border:"rgba(34,197,94,0.25)"},cancelled:{bg:"rgba(107,114,128,0.12)",text:"#6b7280",border:"rgba(107,114,128,0.25)"},passed:{bg:"rgba(34,197,94,0.12)",text:"#22c55e",border:"rgba(34,197,94,0.25)"},warning:{bg:"rgba(251,191,36,0.12)",text:"#fbbf24",border:"rgba(251,191,36,0.25)"}};
function Badge({s}:{s:string}){const c=ST[s]||ST.pending;return<span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.7,background:c.bg,color:c.text,border:"1px solid "+c.border}}>{s}</span>;}
function Stat({label,value,icon,accent}:{label:string;value:any;icon:string;accent:string}){return<div style={{background:V.card,border:"1px solid "+V.line,borderRadius:V.radius,padding:"18px 20px",display:"flex",flexDirection:"column",gap:6,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-18,right:-18,width:70,height:70,borderRadius:"50%",background:accent,filter:"blur(22px)"}} /><div style={{fontSize:20,opacity:.7}}>{icon}</div><div style={{fontSize:28,fontWeight:800,letterSpacing:-1.5,fontFamily:"'JetBrains Mono',monospace",color:V.text}}>{value}</div><div style={{fontSize:11,color:V.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{label}</div></div>;}
function Card({children,style={},id}:{children:any;style?:any;id?:string}){return<div id={id} style={{background:V.card,border:"1px solid "+V.line,borderRadius:V.radius,padding:20,boxShadow:V.shadow,...style}}>{children}</div>;}
function Section({title,icon,children,full=false}:{title:string;icon:string;children:any;full?:boolean}){return<div style={{background:"rgba(255,255,255,0.02)",backdropFilter:"blur(16px)",border:"1px solid "+V.line,borderRadius:18,overflow:"hidden"}}><div style={{padding:"14px 20px",borderBottom:"1px solid "+V.line,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.75)",textTransform:"uppercase",letterSpacing:.8}}>{title}</span></div><div style={{padding:"10px 16px",maxHeight:full?"none":340,overflowY:"auto"}}>{children}</div></div>;}

// === SWOT COMPONENT ===
function SwotSection({swot}:{swot:any}){if(!swot?.applicable)return null;const q:Record<string,{bg:string;border:string;icon:string;label:string}>={s:{bg:"rgba(111,226,163,0.06)",border:"rgba(111,226,163,0.18)",icon:"🟢",label:"Forças"},w:{bg:"rgba(255,125,125,0.06)",border:"rgba(255,125,125,0.18)",icon:"🔴",label:"Fraquezas"},o:{bg:"rgba(255,200,107,0.06)",border:"rgba(255,200,107,0.18)",icon:"🟡",label:"Oportunidades"},t:{bg:"rgba(124,156,255,0.06)",border:"rgba(124,156,255,0.18)",icon:"⚠️",label:"Ameaças"}};return<Card style={{marginBottom:16,border:"1px solid rgba(124,156,255,0.15)"}}><h3 style={{fontSize:18,fontWeight:800,margin:"0 0 12px",color:V.text}}>📊 SWOT / FOFA</h3>{swot.context_intro&&<p style={{color:V.muted,lineHeight:1.7,marginBottom:16,fontSize:13}}>{swot.context_intro}</p>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{(["s","w","o","t"] as const).map(k=>{const cfg=q[k];const items=swot[{s:"strengths",w:"weaknesses",o:"opportunities",t:"threats"}[k]]||[];return<div key={k} style={{borderRadius:14,border:"1px solid "+cfg.border,background:cfg.bg,padding:"14px 16px"}}><div style={{fontWeight:700,fontSize:13,marginBottom:8,color:V.text}}>{cfg.icon} {cfg.label}</div>{items.map((it:any,i:number)=><div key={i} style={{marginBottom:6,fontSize:12}}><strong style={{color:V.text}}>{it.item||it}</strong>{it.evidence&&<div style={{color:V.muted,fontSize:11,marginTop:1}}>{it.evidence}</div>}</div>)}{!items.length&&<div style={{color:V.muted,fontSize:11}}>—</div>}</div>;})}</div></Card>;}

// === TABS ===
const TABS=[{id:"overview",label:"Visão Geral",icon:"⚡"},{id:"research",label:"Pesquisas",icon:"🔍"},{id:"dossiers",label:"Dossiês",icon:"📚"},{id:"presentations",label:"Apresentações",icon:"📊"},{id:"jobs",label:"Jobs",icon:"🔄"},{id:"tasks",label:"Tarefas",icon:"📋"},{id:"calendar",label:"Calendário",icon:"📅"},{id:"audit",label:"Auditoria",icon:"🔎"}];

// === MAIN COMPONENT ===
export default function Dashboard(){
  const[tab,setTab]=useState("overview");
  const[stats,setStats]=useState<Stats|null>(null);
  const[jobs,setJobs]=useState<Job[]>([]);
  const[tasks,setTasks]=useState<Task[]>([]);
  const[events,setEvents]=useState<CalEvent[]>([]);
  const[audit,setAudit]=useState<AuditEvent[]>([]);
  const[research,setResearch]=useState<RReport[]>([]);
  const[selReport,setSelReport]=useState<RReport|null>(null);
  const[dossiers,setDossiers]=useState<DossierData[]>([]);
  const[selDossier,setSelDossier]=useState<DossierData|null>(null);
  const[genLoading,setGenLoading]=useState<string|null>(null);
  const[presentations,setPresentations]=useState<PresentData[]>([]);
  const[selPres,setSelPres]=useState<PresentData|null>(null);
  const[presLoading,setPresLoading]=useState<string|null>(null);
  const[loading,setLoading]=useState(true);
  const[lastUp,setLastUp]=useState<Date|null>(null);
  const[err,setErr]=useState<string|null>(null);
  const[pulse,setPulse]=useState(false);

  const fetchAll=useCallback(async()=>{
    try{setPulse(true);
      const[s,j,t,e,a,rr,dd,pp]=await Promise.all([rpc<Stats>("get_dashboard_stats"),rpc<Job[]>("get_recent_jobs",{p_limit:20}),rpc<Task[]>("get_all_tasks"),rpc<CalEvent[]>("get_all_calendar_events"),rpc<AuditEvent[]>("get_recent_events",{p_limit:30}),rpc<RReport[]>("get_all_research_reports"),rpc<DossierData[]>("get_all_dossiers"),rpc<PresentData[]>("get_all_presentations")]);
      setStats(s);setJobs(j||[]);setTasks(t||[]);setEvents(e||[]);setAudit(a||[]);setResearch(rr||[]);setDossiers(dd||[]);setPresentations(pp||[]);setLastUp(new Date());setErr(null);
    }catch(e){setErr(e instanceof Error?e.message:"Erro");}
    finally{setLoading(false);setTimeout(()=>setPulse(false),600);}
  },[]);
  useEffect(()=>{fetchAll();const iv=setInterval(fetchAll,10000);return()=>clearInterval(iv);},[fetchAll]);

  if(loading)return<div style={{minHeight:"100vh",background:"#060a14",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><div style={{width:48,height:48,border:"3px solid rgba(124,156,255,0.2)",borderTopColor:"#7c9cff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /><div style={{color:"rgba(255,255,255,0.4)",fontSize:14,fontWeight:600}}>Conectando...</div></div>;

  const SB_URL="https://umwqxkggzrpwknptwwju.supabase.co";
  const SB_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3F4a2dnenJwd2tucHR3d2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzUyNjgsImV4cCI6MjA4ODM1MTI2OH0.XL7OKT0C0OlX76_mQVcHXsAVXj8cq_mkLgSVJzyH0lc";

  async function callAgent(url:string,body:any){try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+SB_ANON},body:JSON.stringify(body)});if(r.ok)setTimeout(fetchAll,3000);}catch(_){}}

  return<div style={{minHeight:"100vh",color:"#fff",background:"#060a14",position:"relative",overflow:"hidden",fontFamily:"'Outfit',system-ui,sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}@keyframes pulse-glow{0%,100%{opacity:.3}50%{opacity:.7}}@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(124,156,255,0.25);border-radius:4px}*{box-sizing:border-box;margin:0;padding:0}@media print{.no-print{display:none!important}}`}</style>

    {/* BG Effects */}
    <div style={{position:"fixed",top:-200,left:-200,width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle, rgba(124,156,255,0.06) 0%, transparent 70%)",animation:"float 25s ease-in-out infinite",pointerEvents:"none"}} />
    <div style={{position:"fixed",bottom:-150,right:-150,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle, rgba(78,227,193,0.04) 0%, transparent 70%)",animation:"float 30s ease-in-out infinite reverse",pointerEvents:"none"}} />

    {/* HEADER */}
    <header className="no-print" style={{position:"relative",zIndex:10,padding:"20px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg, #7c9cff, #4ee3c1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 20px rgba(124,156,255,0.3)"}}>🌍</div>
        <div><div style={{fontSize:17,fontWeight:800,letterSpacing:-.5}}>MUNDO ROBERTH</div><div style={{fontSize:10,color:V.muted,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Dashboard v0.8 · Arquitetura v4</div></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.15)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px rgba(34,197,94,0.6)",animation:pulse?"pulse-glow 0.6s ease":"none"}} />
          <span style={{fontSize:10,color:"#22c55e",fontWeight:700}}>LIVE</span>
        </div>
        <span style={{fontSize:10,color:V.muted}}>{lastUp?ago(lastUp.toISOString()):""}</span>
        <button onClick={fetchAll} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"7px 12px",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:11,fontWeight:600}}>↻</button>
      </div>
    </header>

    {/* NAV */}
    <nav className="no-print" style={{position:"relative",zIndex:10,padding:"0 28px",display:"flex",gap:3,borderBottom:"1px solid rgba(255,255,255,0.04)",overflowX:"auto"}}>
      {TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSelReport(null);setSelDossier(null);setSelPres(null);}} style={{padding:"12px 16px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?"#fff":"rgba(255,255,255,0.3)",fontSize:12,fontWeight:tab===t.id?700:500,borderBottom:tab===t.id?"2px solid #7c9cff":"2px solid transparent",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}><span>{t.icon}</span> {t.label}{t.id==="research"&&research.length>0&&<span style={{background:"rgba(124,156,255,0.15)",color:"#7c9cff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,marginLeft:2}}>{research.length}</span>}</button>)}
    </nav>

    {err&&<div style={{margin:"14px 28px",padding:"10px 14px",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:12,fontWeight:600}}>{err}</div>}

    <main style={{position:"relative",zIndex:10,padding:"20px 28px",animation:"slideIn 0.3s ease"}}>

      {/* ===== OVERVIEW ===== */}
      {tab==="overview"&&stats&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:12}}>
          <Stat label="Pesquisas" value={stats.total_research||0} icon="🔍" accent="rgba(124,156,255,0.06)" />
          <Stat label="Fontes" value={stats.total_sources||0} icon="🔗" accent="rgba(78,227,193,0.06)" />
          <Stat label="Acadêmicas" value={stats.total_academic_sources||0} icon="🎓" accent="rgba(255,200,107,0.06)" />
          <Stat label="Dossiês" value={stats.total_dossiers||0} icon="📚" accent="rgba(124,156,255,0.06)" />
          <Stat label="Apresentações" value={stats.total_presentations||0} icon="📊" accent="rgba(255,125,125,0.06)" />
          <Stat label="Evidências" value={stats.total_evidence||0} icon="🧪" accent="rgba(78,227,193,0.06)" />
          <Stat label="Ramos" value={stats.total_branches||0} icon="🌿" accent="rgba(124,156,255,0.06)" />
          <Stat label="Quality Gates" value={stats.quality_gates_passed||0} icon="🛡️" accent="rgba(111,226,163,0.06)" />
          <Stat label="Sucesso" value={(stats.success_rate||0)+"%"} icon="📈" accent="rgba(111,226,163,0.06)" />
          <Stat label="Qualidade" value={stats.avg_quality||0} icon="⭐" accent="rgba(255,200,107,0.06)" />
          <Stat label="Concluídos" value={stats.jobs_completed||0} icon="✅" accent="rgba(111,226,163,0.06)" />
          <Stat label="Memória" value={stats.memory_entries||0} icon="🧠" accent="rgba(78,227,193,0.06)" />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Section title={"Últimos Jobs"} icon="🔄">{jobs.slice(0,8).map((j,i)=><div key={j.id} style={{padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:`slideIn 0.3s ease ${.04*i}s both`}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.user_message?String(j.user_message).replace(/"/g,""):"—"}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{j.action||j.intent||"..."} · {ago(j.created_at)}</div></div><Badge s={j.status}/></div>)}</Section>
          <Section title="Auditoria" icon="🔎">{audit.slice(0,10).map((e,i)=><div key={e.id} style={{padding:"7px 4px",borderBottom:"1px solid rgba(255,255,255,0.03)",animation:`slideIn 0.3s ease ${.03*i}s both`}}><div style={{display:"flex",alignItems:"center",gap:6}}><Badge s={e.status}/><span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ago(e.created_at)}</span></div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.message}</div></div>)}</Section>
        </div>
      </div>}

      {/* ===== RESEARCH ===== */}
      {tab==="research"&&(selReport?<div style={{animation:"slideIn 0.4s ease"}}>
        <button onClick={()=>setSelReport(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+V.line,borderRadius:12,padding:"8px 14px",color:V.muted,cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:16}}>← Voltar</button>
        <Card style={{marginBottom:16,background:"linear-gradient(180deg, rgba(124,156,255,0.06), rgba(255,255,255,0.03))"}}>
          <h1 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:900,letterSpacing:"-0.02em",margin:"0 0 10px"}}>{selReport.topic}</h1>
          <p style={{color:V.muted,fontSize:14,margin:"0 0 14px"}}>{(selReport.executive_summary||selReport.summary||"").substring(0,250)}</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[["Fontes",String(selReport.sources_count)],["Modo",selReport.mode||"—"],["Confiança",selReport.confidence||"—"],["Rounds",String(selReport.search_rounds||0)]].map(([l,v],i)=><span key={i} style={{padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid "+V.line,borderRadius:999,color:V.muted,fontSize:12}}>{l}: <strong style={{color:V.text}}>{v}</strong></span>)}
            {selReport.source_tiers&&<span style={{padding:"8px 12px",background:"rgba(124,156,255,0.08)",border:"1px solid rgba(124,156,255,0.2)",borderRadius:999,color:"#dce5ff",fontSize:12}}>🎓 T1:{selReport.source_tiers.tier1||0} 🏛 T2:{selReport.source_tiers.tier2||0} 📰 T3:{selReport.source_tiers.tier3_4||0}</span>}
            {selReport.branches&&selReport.branches.length>0&&<span style={{padding:"8px 12px",background:"rgba(78,227,193,0.08)",border:"1px solid rgba(78,227,193,0.2)",borderRadius:999,color:"#a7f3d0",fontSize:12}}>🌿 {selReport.branches.length} ramos</span>}
            {(selReport.evidence_count||0)>0&&<span style={{padding:"8px 12px",background:"rgba(255,200,107,0.08)",border:"1px solid rgba(255,200,107,0.2)",borderRadius:999,color:"#fde68a",fontSize:12}}>🧪 {selReport.evidence_count} evidências</span>}
          </div>
        </Card>
        {/* Branches */}
        {selReport.branches&&selReport.branches.length>0&&<Card style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 12px"}}>🌿 Ramos de Pesquisa</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))",gap:10}}>{selReport.branches.map((b:any,i:number)=><div key={i} style={{padding:"12px 14px",borderRadius:14,border:"1px solid "+V.line,background:b.status==="completed"?"rgba(34,197,94,0.04)":"rgba(255,255,255,0.02)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><strong style={{color:V.text,fontSize:12}}>{b.branch_name}</strong><Badge s={b.status}/></div><div style={{fontSize:11,color:V.muted}}>{b.branch_type} · {b.sources_found||0} fontes · {b.evidence_count||0} evidências{b.duration_ms?` · ${(b.duration_ms/1000).toFixed(1)}s`:""}</div>{b.result_summary&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const}}>{b.result_summary}</div>}</div>)}</div></Card>}
        {/* Report content */}
        <Card style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 12px"}}>Relatório Completo</h3><div style={{color:V.muted,lineHeight:1.75,fontFamily:"'Outfit',Georgia,serif",fontSize:14}} dangerouslySetInnerHTML={{__html:md2html(selReport.full_report||selReport.main_answer||"")}} /></Card>
        {/* Sources table */}
        {(selReport.sources||[]).length>0&&<Card style={{padding:0,overflow:"hidden",marginBottom:16}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["Fonte","Tipo","Camada","Força","Autor"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",borderBottom:"1px solid "+V.line,color:"#dfe6ff",background:"rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.05+"em"}}>{h}</th>)}</tr></thead><tbody>{(selReport.sources||[]).map((s:any,i:number)=><tr key={i} style={{borderBottom:"1px solid "+V.line}}><td style={{padding:"10px 14px",fontSize:12}}>{s.url?<a href={s.url} target="_blank" rel="noopener" style={{color:V.accent,textDecoration:"underline"}}>{(s.title||"").substring(0,45)}</a>:(s.title||"").substring(0,45)}</td><td style={{padding:"10px 14px",fontSize:11,color:V.muted}}>{s.academic_type||"—"}</td><td style={{padding:"10px 14px",fontSize:11,color:V.muted}}>{s.source_layer||"—"}</td><td style={{padding:"10px 14px"}}><span style={{color:{strong:V.success,medium:V.warning,weak:V.danger}[s.source_strength as string]||V.muted,fontWeight:700,fontSize:11}}>{s.source_strength||"—"}</span></td><td style={{padding:"10px 14px",fontSize:11,color:V.muted}}>{s.authors||s.institution||"—"}</td></tr>)}</tbody></table></div></Card>}
        <SwotSection swot={selReport.swot_analysis} />
      </div>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:14}}>
        {!research.length&&<div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.15)",gridColumn:"1/-1"}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:700}}>Nenhuma pesquisa</div><div style={{fontSize:12,color:"rgba(255,255,255,0.2)",marginTop:6}}>Mande "Pesquisar sobre..." pro bot</div></div>}
        {research.map((r,i)=><div key={r.id} onClick={()=>r.status==="completed"&&setSelReport(r)} style={{background:V.card,border:"1px solid "+V.line,borderRadius:16,padding:"20px 22px",cursor:r.status==="completed"?"pointer":"default",transition:"all 0.3s",animation:`slideIn 0.4s ease ${.05*i}s both`}} onMouseEnter={e=>{if(r.status==="completed"){e.currentTarget.style.borderColor="rgba(124,156,255,0.2)";e.currentTarget.style.transform="translateY(-2px)";}}} onMouseLeave={e=>{e.currentTarget.style.borderColor=V.line;e.currentTarget.style.transform="";}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Badge s={r.status}/><span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ago(r.created_at)}</span></div>
          <h3 style={{fontSize:14,fontWeight:800,margin:"0 0 6px",lineHeight:1.3}}>{r.topic}</h3>
          {r.summary&&<p style={{fontSize:11,color:"rgba(255,255,255,0.35)",lineHeight:1.5,margin:"0 0 10px",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const}}>{(r.executive_summary||r.summary||"").replace(/[#*]/g,"").substring(0,160)}</p>}
          <div style={{display:"flex",gap:10,alignItems:"center",fontSize:10,color:"rgba(255,255,255,0.25)"}}>
            <span>📊 {r.sources_count} fontes</span>
            {r.confidence&&<span>{r.confidence==="high"?"🟢":"🟡"} {r.confidence}</span>}
            {r.branches&&r.branches.length>0&&<span>🌿 {r.branches.length} ramos</span>}
            {r.metadata?.method&&<span style={{fontSize:9,opacity:.5}}>{r.metadata.method}</span>}
          </div>
        </div>)}
      </div>)}

      {/* ===== DOSSIERS ===== */}
      {tab==="dossiers"&&(selDossier?<div style={{animation:"slideIn 0.4s ease"}}>
        <button onClick={()=>setSelDossier(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+V.line,borderRadius:12,padding:"8px 14px",color:V.muted,cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:16}}>← Voltar</button>
        <Card style={{marginBottom:16,border:"1px solid rgba(78,227,193,0.15)",background:"linear-gradient(180deg, rgba(78,227,193,0.04), rgba(255,255,255,0.02))"}}>
          <h1 style={{fontSize:"clamp(20px,3vw,34px)",fontWeight:900,letterSpacing:"-0.02em",margin:"0 0 10px"}}>{selDossier.title}</h1>
          <p style={{color:V.muted,fontSize:14,margin:"0 0 12px"}}>{(selDossier.executive_summary||"").substring(0,200)}</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[["Fontes orig.",String(selDossier.sources_analyzed)],["Fontes novas",String(selDossier.new_sources_found)],["Vertentes",String(selDossier.vertentes_covered)],["Confiança",selDossier.confidence||"—"]].map(([l,v],i)=><span key={i} style={{padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid "+V.line,borderRadius:999,color:V.muted,fontSize:12}}>{l}: <strong style={{color:V.text}}>{v}</strong></span>)}
          </div>
          <button onClick={()=>window.print()} style={{border:"none",cursor:"pointer",padding:"10px 14px",borderRadius:12,fontWeight:700,fontSize:13,background:"linear-gradient(135deg, "+V.accent+", "+V.accent2+")",color:"#060a14",marginTop:14}}>Imprimir / PDF</button>
        </Card>
        <Card style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 12px"}}>Análise Completa</h3><div style={{color:V.muted,lineHeight:1.8,fontFamily:"'Outfit',Georgia,serif",fontSize:14}} dangerouslySetInnerHTML={{__html:md2html(selDossier.detailed_analysis||selDossier.executive_summary||"")}} /></Card>
        {selDossier.key_findings&&selDossier.key_findings.length>0&&<Card style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 12px"}}>Achados Principais</h3>{selDossier.key_findings.map((f:any,i:number)=><div key={i} style={{padding:"10px 14px",borderRadius:12,border:"1px solid "+V.line,background:f.type==="confirmed"?"rgba(111,226,163,0.06)":"rgba(124,156,255,0.06)",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:f.type==="confirmed"?V.success:f.type==="disputed"?V.warning:V.accent,textTransform:"uppercase"}}>{f.type}</span><div style={{fontWeight:600,marginTop:3,color:V.text,fontSize:13}}>{f.finding}</div>{f.evidence&&<div style={{fontSize:12,color:V.muted,marginTop:3}}>{f.evidence}</div>}</div>)}</Card>}
        <SwotSection swot={selDossier.swot_analysis} />
      </div>
      :<div style={{animation:"slideIn 0.4s ease"}}>
        <div style={{marginBottom:20}}><h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>📚 Dossiês de Aprofundamento</h2><p style={{color:V.muted,fontSize:13,margin:0}}>Gere dossiês profundos a partir de pesquisas concluídas.</p></div>
        {dossiers.filter(d=>d.status==="completed").length>0&&<><h3 style={{fontSize:14,fontWeight:700,color:V.accent2,marginBottom:12,textTransform:"uppercase",letterSpacing:.8}}>Dossiês Gerados</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:14,marginBottom:24}}>{dossiers.filter(d=>d.status==="completed").map((d,i)=><div key={d.id} onClick={()=>setSelDossier(d)} style={{background:V.card,border:"1px solid rgba(78,227,193,0.12)",borderRadius:16,padding:"20px 22px",cursor:"pointer",transition:"all 0.3s",animation:`slideIn 0.4s ease ${.05*i}s both`}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(78,227,193,0.3)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(78,227,193,0.12)";e.currentTarget.style.transform="";}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Badge s={d.status}/><span style={{fontSize:10,color:V.muted}}>{ago(d.created_at)}</span></div>
          <h3 style={{fontSize:14,fontWeight:800,margin:"0 0 6px"}}>{d.title}</h3>
          <p style={{fontSize:11,color:V.muted,lineHeight:1.5,margin:"0 0 10px",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const}}>{(d.executive_summary||"").replace(/[#*]/g,"").substring(0,120)}</p>
          <div style={{display:"flex",gap:10,fontSize:10,color:V.muted}}><span>📊 {d.sources_analyzed}+{d.new_sources_found} fontes</span><span>{d.vertentes_covered} vertentes</span><span style={{color:"#4ee3c1",fontWeight:600}}>Ver dossiê →</span></div>
        </div>)}</div></>}
        <h3 style={{fontSize:14,fontWeight:700,color:V.accent,marginBottom:12,textTransform:"uppercase",letterSpacing:.8}}>Pesquisas Disponíveis</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:14}}>{research.filter(r=>r.status==="completed").map((r,i)=>{const has=dossiers.find(d=>d.original_research?.id===r.id);const loading=genLoading===r.id;return<div key={r.id} style={{background:V.card,border:"1px solid "+V.line,borderRadius:16,padding:"20px 22px",animation:`slideIn 0.4s ease ${.05*i}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:10,color:V.muted}}>🔍 {r.sources_count} fontes</span><span style={{fontSize:10,color:V.muted}}>{ago(r.created_at)}</span></div>
          <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px"}}>{r.topic}</h3>
          {has?<button onClick={()=>setSelDossier(has)} style={{background:"rgba(78,227,193,0.08)",border:"1px solid rgba(78,227,193,0.2)",borderRadius:12,padding:"8px 14px",color:"#4ee3c1",cursor:"pointer",fontSize:12,fontWeight:700,width:"100%"}}>Ver Dossiê →</button>
          :<button disabled={loading} onClick={async()=>{setGenLoading(r.id);await callAgent(SB_URL+"/functions/v1/dossier-agent",{report_id:r.id});setGenLoading(null);}} style={{background:loading?"rgba(255,255,255,0.02)":"linear-gradient(135deg, "+V.accent+", "+V.accent2+")",border:"none",borderRadius:12,padding:"8px 14px",color:loading?V.muted:"#060a14",cursor:loading?"default":"pointer",fontSize:12,fontWeight:700,width:"100%"}}>{loading?"⏳ Gerando...":"📚 Gerar Dossiê"}</button>}
        </div>})}</div>
      </div>)}

      {/* ===== PRESENTATIONS ===== */}
      {tab==="presentations"&&(selPres?<div style={{animation:"slideIn 0.4s ease"}} className="presentation-view">
        <style>{`@media print{.no-print{display:none!important}.presentation-view{padding:0!important}}`}</style>
        <button className="no-print" onClick={()=>setSelPres(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+V.line,borderRadius:12,padding:"8px 14px",color:V.muted,cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:16}}>← Voltar</button>
        {selPres.hero_section&&<Card style={{marginBottom:16,border:"1px solid rgba(255,200,107,0.15)",background:"linear-gradient(135deg, rgba(255,200,107,0.04), rgba(124,156,255,0.03))",padding:32}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{(selPres.hero_section.badges||[]).map((b:string,i:number)=><span key={i} style={{padding:"5px 10px",borderRadius:999,background:"rgba(255,200,107,0.1)",border:"1px solid rgba(255,200,107,0.25)",color:"#ffc86b",fontSize:11,fontWeight:700}}>{b}</span>)}</div>
          <h1 style={{fontSize:"clamp(24px,3.5vw,42px)",fontWeight:900,letterSpacing:"-0.02em",margin:"0 0 10px",lineHeight:1.15}}>{selPres.title}</h1>
          <p style={{color:V.muted,fontSize:15,maxWidth:800,margin:"0 0 16px",lineHeight:1.7}}>{selPres.hero_section.summary||selPres.subtitle}</p>
          <button className="no-print" onClick={()=>window.print()} style={{border:"none",cursor:"pointer",padding:"10px 16px",borderRadius:12,fontWeight:700,fontSize:13,background:"linear-gradient(135deg, #ffc86b, "+V.accent2+")",color:"#060a14"}}>📄 Baixar PDF</button>
        </Card>}
        {selPres.highlights&&selPres.highlights.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:12,marginBottom:16}}>{selPres.highlights.map((h:any,i:number)=><Card key={i} style={{textAlign:"center",padding:16}}><div style={{fontSize:24}}>{h.icon||"📌"}</div><div style={{fontSize:24,fontWeight:800,margin:"6px 0 2px"}}>{h.value}</div><div style={{fontSize:11,color:V.muted}}>{h.label}</div></Card>)}</div>}
        {selPres.executive_summary&&<Card style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>📝 Resumo Executivo</h2><div style={{color:V.muted,lineHeight:1.8,fontSize:14}} dangerouslySetInnerHTML={{__html:md2html(selPres.executive_summary)}} /></Card>}
        {(selPres.sections||[]).map((s:any,i:number)=>{
          if(s.type==="cards")return<div key={i} style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>{s.icon||""} {s.title}</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:12}}>{(s.items||[]).map((it:any,j:number)=><Card key={j}>{it.badge&&<span style={{display:"inline-block",padding:"3px 8px",borderRadius:999,background:"rgba(124,156,255,0.1)",color:V.accent,fontSize:10,fontWeight:700,marginBottom:8}}>{it.badge}</span>}<h3 style={{fontSize:14,fontWeight:700,margin:"0 0 6px"}}>{it.title}</h3><p style={{color:V.muted,fontSize:12,lineHeight:1.5,margin:0}}>{it.content}</p></Card>)}</div></div>;
          if(s.type==="timeline")return<Card key={i} style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>{s.icon||"⏳"} {s.title}</h2>{(s.items||[]).map((it:any,j:number)=><div key={j} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:j<(s.items||[]).length-1?"1px solid "+V.line:"none"}}><div style={{minWidth:90,color:V.accent2,fontWeight:700,fontSize:12}}>{it.date||it.title}</div><div><div style={{fontWeight:600,fontSize:13}}>{it.event||it.badge||""}</div><div style={{color:V.muted,fontSize:12}}>{it.content||it.detail||""}</div></div></div>)}</Card>;
          if(s.type==="quote")return<div key={i} style={{marginBottom:16,padding:"20px 24px",borderLeft:"4px solid "+V.warning,background:"rgba(255,200,107,0.04)",borderRadius:16}}><div style={{fontSize:28,color:V.warning,lineHeight:1}}>\u201C</div><div style={{fontSize:15,fontStyle:"italic",lineHeight:1.7,color:V.text,margin:"6px 0"}}>{s.content}</div>{s.title&&<div style={{color:V.muted,fontSize:12}}>— {s.title}</div>}</div>;
          if(s.type==="highlights")return<div key={i} style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>{s.icon||""} {s.title}</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>{(s.items||[]).map((it:any,j:number)=><Card key={j} style={{borderLeft:"4px solid "+V.accent2}}><div style={{fontWeight:800,fontSize:20}}>{it.title}</div><div style={{color:V.muted,fontSize:12}}>{it.content}</div></Card>)}</div></div>;
          return<Card key={i} style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>{s.icon||""} {s.title}</h2><div style={{color:V.muted,lineHeight:1.8,fontSize:14}} dangerouslySetInnerHTML={{__html:md2html(s.content||"")}} />{s.items&&s.items.length>0&&s.items.map((it:any,j:number)=><div key={j} style={{padding:"8px 0",borderBottom:"1px solid "+V.line}}><strong>{it.title}</strong><div style={{color:V.muted,fontSize:12}}>{it.content}</div></div>)}</Card>;
        })}
        <SwotSection swot={selPres.swot_visual} />
        {selPres.sources_panel&&selPres.sources_panel.length>0&&<Card style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px"}}>🔗 Fontes ({selPres.sources_panel.length})</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:8}}>{selPres.sources_panel.map((s:any,i:number)=><div key={i} style={{padding:"10px 12px",borderRadius:12,border:"1px solid "+V.line,background:"rgba(255,255,255,0.02)"}}><div style={{fontWeight:600,fontSize:12}}>{s.url?<a href={s.url} target="_blank" rel="noopener" style={{color:V.accent}}>{(s.title||"").substring(0,50)} ↗</a>:(s.title||"").substring(0,50)}</div><div style={{color:V.muted,fontSize:10,marginTop:3}}>{s.type||""} • {s.strength||""}</div></div>)}</div></Card>}
        {selPres.conclusion&&<Card style={{marginBottom:16,border:"1px solid rgba(78,227,193,0.15)"}}><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 12px",color:V.accent2}}>✅ Conclusão</h2><div style={{color:V.muted,lineHeight:1.8,fontSize:14}} dangerouslySetInnerHTML={{__html:md2html(selPres.conclusion)}} /></Card>}
      </div>
      :<div style={{animation:"slideIn 0.4s ease"}}>
        <div style={{marginBottom:20}}><h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>📊 Apresentações Documentais</h2><p style={{color:V.muted,fontSize:13,margin:0}}>Gere apresentações visuais a partir de dossiês.</p></div>
        {presentations.filter(p=>p.status==="completed").length>0&&<><h3 style={{fontSize:14,fontWeight:700,color:V.warning,marginBottom:12,textTransform:"uppercase",letterSpacing:.8}}>Apresentações Geradas</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:14,marginBottom:24}}>{presentations.filter(p=>p.status==="completed").map((p,i)=><div key={p.id} onClick={()=>setSelPres(p)} style={{background:V.card,border:"1px solid rgba(255,200,107,0.12)",borderRadius:16,padding:"20px 22px",cursor:"pointer",transition:"all 0.3s",animation:`slideIn 0.4s ease ${.05*i}s both`}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,200,107,0.3)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,200,107,0.12)";e.currentTarget.style.transform="";}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Badge s={p.status}/><span style={{fontSize:10,color:V.muted}}>{ago(p.created_at)}</span></div>
          <h3 style={{fontSize:14,fontWeight:800,margin:"0 0 6px"}}>{p.title}</h3>
          <div style={{display:"flex",gap:10,fontSize:10,color:V.muted}}><span>{p.total_sections} seções</span><span>{p.total_sources} fontes</span><span style={{color:"#ffc86b",fontWeight:600}}>Abrir →</span></div>
        </div>)}</div></>}
        <h3 style={{fontSize:14,fontWeight:700,color:V.accent2,marginBottom:12,textTransform:"uppercase",letterSpacing:.8}}>Dossiês Disponíveis</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:14}}>{dossiers.filter(d=>d.status==="completed").map((d,i)=>{const has=presentations.find(p=>p.dossier_info?.id===d.id);const loading=presLoading===d.id;return<div key={d.id} style={{background:V.card,border:"1px solid "+V.line,borderRadius:16,padding:"20px 22px",animation:`slideIn 0.4s ease ${.05*i}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:10,color:V.muted}}>📚 {d.sources_analyzed} fontes</span><span style={{fontSize:10,color:V.muted}}>{ago(d.created_at)}</span></div>
          <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px"}}>{d.title}</h3>
          {has?<button onClick={()=>setSelPres(has)} style={{background:"rgba(255,200,107,0.08)",border:"1px solid rgba(255,200,107,0.2)",borderRadius:12,padding:"8px 14px",color:"#ffc86b",cursor:"pointer",fontSize:12,fontWeight:700,width:"100%"}}>Ver Apresentação →</button>
          :<button disabled={loading} onClick={async()=>{setPresLoading(d.id);await callAgent(SB_URL+"/functions/v1/presentation-agent",{dossier_id:d.id});setPresLoading(null);}} style={{background:loading?"rgba(255,255,255,0.02)":"linear-gradient(135deg, #ffc86b, "+V.accent2+")",border:"none",borderRadius:12,padding:"8px 14px",color:loading?V.muted:"#060a14",cursor:loading?"default":"pointer",fontSize:12,fontWeight:700,width:"100%"}}>{loading?"⏳ Gerando...":"📊 Gerar Apresentação"}</button>}
        </div>})}{!dossiers.filter(d=>d.status==="completed").length&&<div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.15)"}}><div style={{fontSize:48,marginBottom:12}}>📚</div><div style={{fontSize:14,fontWeight:700}}>Nenhum dossiê concluído</div></div>}</div>
      </div>)}

      {/* ===== JOBS ===== */}
      {tab==="jobs"&&<Section title={"Jobs ("+jobs.length+")"} icon="🔄" full>{<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{["Status","Mensagem","Ação","Qualidade","Agente","Data"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:"rgba(255,255,255,0.3)",fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{jobs.map((j,i)=><tr key={j.id} style={{borderBottom:"1px solid rgba(255,255,255,0.02)",animation:`slideIn 0.3s ease ${.02*i}s both`}}><td style={{padding:"8px 6px"}}><Badge s={j.status}/></td><td style={{padding:"8px 6px",color:"rgba(255,255,255,0.55)",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.user_message?String(j.user_message).replace(/"/g,""):"—"}</td><td style={{padding:"8px 6px",color:"rgba(124,156,255,0.75)",fontWeight:600}}>{j.action||j.intent||"—"}</td><td style={{padding:"8px 6px"}}>{j.quality_score?<span style={{fontSize:11,fontWeight:700,color:j.quality_score>=.8?V.success:j.quality_score>=.6?V.warning:V.danger}}>{(j.quality_score*100).toFixed(0)}%</span>:"—"}</td><td style={{padding:"8px 6px",color:"rgba(255,255,255,0.25)",fontSize:10}}>{j.agent_version||"—"}</td><td style={{padding:"8px 6px",color:"rgba(255,255,255,0.3)",fontSize:10}}>{fmt(j.created_at)}</td></tr>)}</tbody></table></div>}</Section>}

      {/* ===== TASKS ===== */}
      {tab==="tasks"&&<Section title={"Tarefas ("+tasks.length+")"} icon="📋" full>{tasks.length?tasks.map((t,i)=><div key={t.id} style={{padding:"12px 6px",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:`slideIn 0.3s ease ${.04*i}s both`}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{t.title}</div>{t.description&&<div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>{t.description}</div>}{t.due_at&&<div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:3}}>Prazo: {fmt(t.due_at)}</div>}</div><Badge s={t.status}/></div>):<div style={{padding:30,textAlign:"center",color:"rgba(255,255,255,0.15)"}}>Nenhuma tarefa</div>}</Section>}

      {/* ===== CALENDAR ===== */}
      {tab==="calendar"&&<Section title={"Eventos ("+events.length+")"} icon="📅" full>{events.length?events.map((e,i)=><div key={e.id} style={{padding:"12px 6px",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",gap:12,animation:`slideIn 0.3s ease ${.04*i}s both`}}><div style={{minWidth:46,textAlign:"center",padding:"6px",borderRadius:8,background:"rgba(124,156,255,0.08)",border:"1px solid rgba(124,156,255,0.15)"}}><div style={{fontSize:16,fontWeight:800,color:"#7c9cff"}}>{new Date(e.start_at).getDate()}</div><div style={{fontSize:9,color:"rgba(124,156,255,0.6)",fontWeight:700,textTransform:"uppercase"}}>{new Date(e.start_at).toLocaleString("pt-BR",{month:"short"})}</div></div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{e.title}</div>{e.description&&<div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>{e.description}</div>}<div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:3}}>{e.all_day?"Dia inteiro":fmt(e.start_at)}</div></div><Badge s={e.status}/></div>):<div style={{padding:30,textAlign:"center",color:"rgba(255,255,255,0.15)"}}>Nenhum evento</div>}</Section>}

      {/* ===== AUDIT ===== */}
      {tab==="audit"&&<Section title={"Auditoria ("+audit.length+")"} icon="🔎" full>{audit.map((e,i)=><div key={e.id} style={{padding:"8px 6px",borderLeft:"3px solid "+(ST[e.status]||ST.pending).text,marginLeft:6,animation:`slideIn 0.3s ease ${.02*i}s both`,background:i%2===0?"rgba(255,255,255,0.008)":"transparent",borderRadius:"0 8px 8px 0"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><Badge s={e.status}/><span style={{fontSize:10,color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(e.created_at)}</span></div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{e.message}</div></div>)}</Section>}
    </main>

    {/* FOOTER */}
    <footer className="no-print" style={{position:"relative",zIndex:10,padding:"14px 28px",textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.03)"}}>
      <span style={{fontSize:10,color:"rgba(255,255,255,0.1)"}}>Mundo Roberth v0.8 · Arquitetura v4 · Research v15 · Dossier v7 · 7 Agentes · 26 Tabelas · Auto-refresh 10s</span>
    </footer>
  </div>;
}
