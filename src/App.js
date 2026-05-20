import { useState, useEffect, useRef } from "react";

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const PRIORITY_BG = { High: "#ef444422", Medium: "#f59e0b22", Low: "#22c55e22" };
const MOTIVATIONAL = ["Discipline is the bridge between goals and accomplishment.", "Focus on progress, not perfection.", "One task at a time, success is near!", "Your effort today shapes tomorrow.", "Stay consistent, stay unstoppable!"];
const APPRECIATION = ["Well done! 🎉 Task completed!", "Excellent! 🌟 Keep it up!", "Fantastic! 🏆 You are the best!", "Amazing! 🎊 Keep going!"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getToday() { return new Date().toISOString().split("T")[0]; }
function loadData() { try { const d = localStorage.getItem("taskapp_v6"); return d ? JSON.parse(d) : null; } catch { return null; } }
function saveData(d) { try { localStorage.setItem("taskapp_v6", JSON.stringify(d)); } catch {} }
function autoRollover(tasks) {
  const today = getToday();
  return tasks.map(t => (!t.done && t.date < today) ? { ...t, date: today, rolledOver: true, rolloverReason: t.rolloverReason || "Auto rolled over" } : t);
}

// Detect mobile
function isMobile() { return window.innerWidth <= 768; }

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: "", desc: "", time: "", priority: "Medium" });
  const [streak, setStreak] = useState(0);
  const [lastCompleteDate, setLastCompleteDate] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [rolloverModal, setRolloverModal] = useState(null);
  const [rolloverReason, setRolloverReason] = useState("");
  const [view, setView] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState([0,0,0,0,0,0,0]);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ title:"", desc:"", time:"", priority:"Medium" });
  const [mobile, setMobile] = useState(isMobile());
  const notifRef = useRef({});
  const [quote] = useState(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const d = loadData();
    if (d) {
      setTasks(autoRollover(d.tasks || []));
      setStreak(d.streak || 0);
      setLastCompleteDate(d.lastCompleteDate || "");
      setHistory(d.history || []);
      setWeeklyData(d.weeklyData || [0,0,0,0,0,0,0]);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTasks(prev => autoRollover(prev)), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { saveData({ tasks, streak, lastCompleteDate, history, weeklyData }); }, [tasks, streak, lastCompleteDate, history, weeklyData]);

  useEffect(() => { if (Notification.permission === "default") Notification.requestPermission(); }, []);

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }

  function addTask() {
    if (!form.title.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), title: form.title.trim(), desc: form.desc.trim(), time: form.time, priority: form.priority, done: false, date: getToday(), rolledOver: false, rolloverReason: "" }]);
    setForm({ title: "", desc: "", time: "", priority: "Medium" });
    setShowAdd(false);
    showToast("✅ Task added!");
  }

  function completeTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? {...t, done: true} : t));
    showToast(APPRECIATION[Math.floor(Math.random()*APPRECIATION.length)], "appreciate");
    const today = getToday();
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    if (lastCompleteDate !== today) { setStreak(s => lastCompleteDate===yest.toISOString().split("T")[0]||!lastCompleteDate ? s+1 : 1); setLastCompleteDate(today); }
    const day = new Date().getDay();
    setWeeklyData(prev => { const n=[...prev]; n[day]=(n[day]||0)+1; return n; });
  }

  function deleteTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); showToast("🗑️ Deleted!"); }

  function openEdit(t) { setEditForm({ title: t.title, desc: t.desc||"", time: t.time||"", priority: t.priority }); setEditModal(t); }

  function saveEdit() {
    if (!editForm.title.trim()) { showToast("Title cannot be empty!", "error"); return; }
    setTasks(prev => prev.map(t => t.id===editModal.id ? { ...t, ...editForm, title: editForm.title.trim(), desc: editForm.desc.trim() } : t));
    setEditModal(null); showToast("✏️ Updated!");
  }

  function confirmRollover() {
    if (!rolloverReason.trim()) { showToast("Please enter a reason!", "error"); return; }
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    const tStr = tom.toISOString().split("T")[0];
    setHistory(prev => [...prev, { id: rolloverModal.id, title: rolloverModal.title, date: getToday(), rolledTo: tStr, reason: rolloverReason }]);
    setTasks(prev => prev.map(t => t.id===rolloverModal.id ? {...t, date: tStr, rolledOver: true, rolloverReason} : t));
    setRolloverModal(null); setRolloverReason("");
    showToast("🔄 Moved to tomorrow!");
  }

  function endDay() {
    const today = getToday();
    const todayT = tasks.filter(t => t.date===today);
    const done = todayT.filter(t => t.done).length;
    if (!todayT.length) { showToast("No tasks for today!", "error"); return; }
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    const tStr = tom.toISOString().split("T")[0];
    setTasks(prev => prev.map(t => (!t.done && t.date===today) ? {...t, date: tStr, rolledOver: true, rolloverReason:"Auto rolled over on Day End"} : t));
    setHistory(prev => [...prev, { type:"daily_summary", date: today, done, total: todayT.length, achievement: done===todayT.length?"Perfect Day! 🏆":done>todayT.length/2?"Good Job! 👍":"Keep Trying! 💪" }]);
    showToast(`🏁 Day ended! ${done}/${todayT.length} done!`, "appreciate");
  }

  const today = getToday();
  const todayTasks = tasks.filter(t => t.date === today);
  const doneTasks = todayTasks.filter(t => t.done);
  const pendingTasks = todayTasks.filter(t => !t.done);
  const allDone = tasks.filter(t => t.done).length;
  const allTotal = tasks.length;
  const todayProgress = todayTasks.length > 0 ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;
  const allTimeRate = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;
  const maxWeekly = Math.max(...weeklyData, 1);
  const greetHour = new Date().getHours();
  const greeting = greetHour<12?"Good Morning ☀️":greetHour<17?"Good Afternoon 🌤️":"Good Evening 🌙";

  const c = {
    bg: darkMode?"#0f1117":"#f1f5f9",
    sidebar: darkMode?"#161b2e":"#1e2640",
    card: darkMode?"#1a2035":"#ffffff",
    card2: darkMode?"#1e2640":"#f8fafc",
    accent:"#6366f1", accent2:"#8b5cf6",
    text: darkMode?"#f1f5f9":"#1e293b",
    sub: darkMode?"#94a3b8":"#64748b",
    border: darkMode?"#ffffff12":"#e2e8f0",
    green:"#22c55e", yellow:"#f59e0b", red:"#ef4444",
    bottomNav: darkMode?"#161b2e":"#ffffff"
  };

  const navItems = [
    {id:"dashboard", icon:"⊞", label:"Home"},
    {id:"tasks",     icon:"☑", label:"Tasks"},
    {id:"calendar",  icon:"📅", label:"Calendar"},
    {id:"history",   icon:"◷", label:"History"},
    {id:"achievements", icon:"★", label:"Awards"},
  ];

  const ib = (bg,bc,col) => ({ background:bg, border:`1px solid ${bc}`, borderRadius:6, color:col, padding:"5px 8px", fontSize:12, cursor:"pointer", fontWeight:600 });

  // ── MOBILE LAYOUT ──
  if (mobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100svh", background:c.bg, color:c.text, fontFamily:"'Segoe UI',sans-serif", overflow:"hidden" }}>

        {/* Toast */}
        {toast && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:toast.type==="error"?c.red:toast.type==="appreciate"?c.accent2:c.green, color:"#fff", padding:"10px 20px", borderRadius:12, fontWeight:600, fontSize:13, zIndex:999, boxShadow:"0 4px 20px #0008", maxWidth:"90vw", textAlign:"center", whiteSpace:"nowrap" }}>{toast.msg}</div>}

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)`, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{greeting}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Stay focused!</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700, color:"#fff" }}>🔥 {streak} days</div>
            <button onClick={()=>setDarkMode(d=>!d)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, color:"#fff", width:32, height:32, fontSize:16, cursor:"pointer" }}>{darkMode?"☀️":"🌙"}</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:"auto", padding:"12px 14px", paddingBottom:70 }}>

          {/* DASHBOARD MOBILE */}
          {view==="dashboard" && (<>
            {/* Stats Row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {[
                {label:"Total", value:allTotal, icon:"📋", color:c.accent},
                {label:"Completed", value:allDone, icon:"✅", color:c.green},
                {label:"Pending", value:pendingTasks.length, icon:"⏳", color:c.yellow},
                {label:"Today", value:`${todayProgress}%`, icon:"📊", color:c.accent2},
              ].map((s,i)=>(
                <div key={i} style={{ background:c.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${c.border}` }}>
                  <div style={{ fontSize:20 }}>{s.icon}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:c.sub }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div style={{ background:c.card, borderRadius:12, padding:"14px", border:`1px solid ${c.border}`, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>📋 Today's Tasks</span>
                <span style={{ color:c.accent, fontWeight:700, fontSize:13 }}>{doneTasks.length}/{todayTasks.length}</span>
              </div>
              <div style={{ height:8, background:c.border, borderRadius:8, marginBottom:14 }}>
                <div style={{ height:"100%", width:`${todayProgress}%`, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, borderRadius:8, transition:"width 0.5s" }}/>
              </div>

              {/* Task List */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {todayTasks.length===0 && <div style={{ textAlign:"center", color:c.sub, padding:"16px 0", fontSize:13 }}>📭 No tasks — tap + to add!</div>}
                {pendingTasks.map(t=>(
                  <div key={t.id} style={{ background:c.card2, borderRadius:10, padding:"10px 12px", borderLeft:`3px solid ${PRIORITY_COLOR[t.priority]}` }}>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{t.title}</div>
                    {t.desc&&<div style={{ fontSize:12, color:c.sub, marginBottom:6 }}>{t.desc}</div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 }}>{t.priority}</span>
                        {t.time&&<span style={{ fontSize:11, color:c.sub }}>⏰{t.time}</span>}
                        {t.rolledOver&&<span style={{ fontSize:10, color:c.yellow }}>🔄</span>}
                      </div>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>completeTask(t.id)} style={ib("#22c55e22","#22c55e55",c.green)}>✓</button>
                        <button onClick={()=>openEdit(t)} style={ib("#6366f122","#6366f155",c.accent)}>✏️</button>
                        <button onClick={()=>{setRolloverModal(t);setRolloverReason("");}} style={ib("#f59e0b22","#f59e0b55",c.yellow)}>⟳</button>
                        <button onClick={()=>deleteTask(t.id)} style={ib("#ef444422","#ef444455",c.red)}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
                {doneTasks.map(t=>(
                  <div key={t.id} style={{ background:"#22c55e08", borderRadius:10, padding:"8px 12px", borderLeft:"3px solid #22c55e44", opacity:0.7, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:600, fontSize:13, textDecoration:"line-through", color:c.sub }}>{t.title}</span>
                    <span>✅</span>
                  </div>
                ))}
              </div>

              {todayTasks.length>0&&(
                <button onClick={endDay} style={{ width:"100%", marginTop:12, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:10, color:"#fff", padding:"10px", fontWeight:700, fontSize:14, cursor:"pointer" }}>🏁 End Day</button>
              )}
            </div>

            {/* Quote */}
            <div style={{ background:c.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${c.border}`, marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#a5b4fc", fontStyle:"italic", lineHeight:1.6 }}>"{quote}"</div>
            </div>

            {/* Weekly */}
            <div style={{ background:c.card, borderRadius:12, padding:"14px", border:`1px solid ${c.border}` }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>📈 This Week</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:70, marginBottom:8 }}>
                {weeklyData.map((v,i)=>(
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <div style={{ width:"100%", height:v>0?`${Math.round((v/maxWeekly)*100)}%`:4, minHeight:4, background:i===new Date().getDay()?`linear-gradient(180deg,${c.accent},${c.accent2})`:c.card2, borderRadius:"3px 3px 0 0" }}/>
                    <div style={{ fontSize:9, color:i===new Date().getDay()?c.accent:c.sub }}>{DAYS[i]}</div>
                  </div>
                ))}
              </div>
            </div>
          </>)}

          {/* TASKS MOBILE */}
          {view==="tasks" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>☑ All Tasks</div>
                <button onClick={()=>setShowAdd(true)} style={{ background:c.accent, border:"none", borderRadius:9, color:"#fff", padding:"7px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {tasks.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40 }}>📭 No tasks yet</div>}
                {tasks.map(t=>(
                  <div key={t.id} style={{ background:c.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${c.border}`, borderLeft:`4px solid ${t.done?"#22c55e66":PRIORITY_COLOR[t.priority]}`, opacity:t.done?0.7:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, textDecoration:t.done?"line-through":"none", color:t.done?c.sub:c.text, marginBottom:4 }}>{t.title}</div>
                    {t.desc&&<div style={{ fontSize:12, color:c.sub, marginBottom:6 }}>{t.desc}</div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 }}>{t.priority}</span>
                        <span style={{ fontSize:11, color:c.sub }}>📅{t.date}</span>
                        {t.time&&<span style={{ fontSize:11, color:c.sub }}>⏰{t.time}</span>}
                        {t.rolledOver&&<span style={{ fontSize:10, color:c.yellow }}>🔄Rolled</span>}
                      </div>
                      {!t.done?(
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={()=>completeTask(t.id)} style={{ background:"#22c55e22", border:"1px solid #22c55e55", borderRadius:7, color:c.green, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:600 }}>✓</button>
                          <button onClick={()=>openEdit(t)} style={{ background:"#6366f122", border:"1px solid #6366f155", borderRadius:7, color:c.accent, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>✏️</button>
                          <button onClick={()=>{setRolloverModal(t);setRolloverReason("");}} style={{ background:"#f59e0b22", border:"1px solid #f59e0b55", borderRadius:7, color:c.yellow, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>⟳</button>
                          <button onClick={()=>deleteTask(t.id)} style={{ background:"#ef444422", border:"1px solid #ef444455", borderRadius:7, color:c.red, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                        </div>
                      ):<span style={{ fontSize:18 }}>✅</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CALENDAR MOBILE */}
          {view==="calendar" && (
            <div style={{ background:c.card, borderRadius:12, padding:14, border:`1px solid ${c.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()-1); setCalendarMonth(d); }} style={{ background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.text, width:34, height:34, cursor:"pointer", fontSize:16 }}>‹</button>
                <div style={{ fontWeight:700, fontSize:15 }}>{calendarMonth.toLocaleString("default",{month:"long"})} {calendarMonth.getFullYear()}</div>
                <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()+1); setCalendarMonth(d); }} style={{ background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.text, width:34, height:34, cursor:"pointer", fontSize:16 }}>›</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
                {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:11, color:c.sub, fontWeight:700, padding:"4px 0" }}>{d}</div>)}
              </div>
              {(()=>{
                const yr=calendarMonth.getFullYear(), mo=calendarMonth.getMonth();
                const firstDay=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate();
                const todayD=new Date();
                const cells=[]; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
                const monthStr=`${yr}-${String(mo+1).padStart(2,"0")}`;
                const tasksByDay={};
                tasks.filter(t=>t.date&&t.date.startsWith(monthStr)).forEach(t=>{ const d=parseInt(t.date.split("-")[2]); if(!tasksByDay[d]) tasksByDay[d]=[]; tasksByDay[d].push(t); });
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                    {cells.map((d,i)=>{
                      const isToday=d===todayD.getDate()&&mo===todayD.getMonth()&&yr===todayD.getFullYear();
                      const dayTasks=d?(tasksByDay[d]||[]):[];
                      return (
                        <div key={i} style={{ minHeight:44, borderRadius:8, background:isToday?c.accent:d?c.card2:"transparent", padding:d?"4px":"", textAlign:"center" }}>
                          {d&&<>
                            <div style={{ fontWeight:isToday?800:500, fontSize:13, color:isToday?"#fff":c.text }}>{d}</div>
                            {dayTasks.length>0&&<div style={{ width:6, height:6, borderRadius:"50%", background:isToday?"#fff":c.accent2, margin:"2px auto 0" }}/>}
                          </>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* HISTORY MOBILE */}
          {view==="history" && (
            <div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>◷ History</div>
              {history.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40 }}>📜 No history yet</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[...history].reverse().map((h,i)=>(
                  <div key={i} style={{ background:c.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${c.border}`, borderLeft:`4px solid ${h.type==="daily_summary"?c.accent:c.yellow}` }}>
                    {h.type==="daily_summary"?(<>
                      <div style={{ fontWeight:700, color:c.accent, fontSize:13 }}>📅 {h.date}</div>
                      <div style={{ fontSize:17, fontWeight:800, marginTop:2 }}>{h.achievement}</div>
                      <div style={{ fontSize:12, color:c.sub }}>{h.done}/{h.total} Tasks Complete</div>
                    </>):(<>
                      <div style={{ fontWeight:600, fontSize:13 }}>🔄 {h.title}</div>
                      <div style={{ fontSize:11, color:c.sub }}>{h.date} → {h.rolledTo}</div>
                      <div style={{ fontSize:11, color:c.yellow }}>Reason: {h.reason}</div>
                    </>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS MOBILE */}
          {view==="achievements" && (
            <div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>★ Achievements</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  {icon:"🔥",title:"Streak Master",desc:`${streak} days!`,unlocked:streak>=1,color:c.yellow},
                  {icon:"✅",title:"Task Crusher",desc:`${allDone} done!`,unlocked:allDone>=1,color:c.green},
                  {icon:"🏆",title:"Perfect Day",desc:"All done in a day!",unlocked:history.some(h=>h.type==="daily_summary"&&h.done===h.total),color:c.accent},
                  {icon:"⚡",title:"Speed Runner",desc:"5+ completed",unlocked:allDone>=5,color:c.accent2},
                  {icon:"📅",title:"Consistent",desc:"3+ day streak",unlocked:streak>=3,color:"#06b6d4"},
                  {icon:"🎯",title:"Goal Setter",desc:"10+ tasks added",unlocked:tasks.length>=10,color:"#ec4899"},
                ].map((a,i)=>(
                  <div key={i} style={{ background:a.unlocked?`${a.color}15`:c.card, borderRadius:12, padding:"14px 12px", border:`1px solid ${a.unlocked?a.color+"44":c.border}`, textAlign:"center", opacity:a.unlocked?1:0.5 }}>
                    <div style={{ fontSize:28, marginBottom:4 }}>{a.icon}</div>
                    <div style={{ fontWeight:700, fontSize:13, color:a.unlocked?a.color:c.sub }}>{a.title}</div>
                    <div style={{ fontSize:11, color:c.sub, marginTop:2 }}>{a.desc}</div>
                    {!a.unlocked&&<div style={{ fontSize:10, marginTop:3, color:c.sub }}>🔒</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FAB - Add Button */}
        <button onClick={()=>setShowAdd(true)} style={{ position:"fixed", bottom:74, right:18, width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${c.accent},${c.accent2})`, border:"none", color:"#fff", fontSize:26, cursor:"pointer", boxShadow:`0 4px 20px ${c.accent}88`, zIndex:40, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>

        {/* Bottom Navigation */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:c.bottomNav, borderTop:`1px solid ${c.border}`, display:"flex", zIndex:50, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8px 0", border:"none", background:"transparent", cursor:"pointer", color:view===n.id?c.accent:c.sub }}>
              <span style={{ fontSize:18, marginBottom:2 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:view===n.id?700:500 }}>{n.label}</span>
            </button>
          ))}
        </div>

        {/* MODALS */}
        {showAdd&&(
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={()=>setShowAdd(false)}>
            <div style={{ background:c.card, borderRadius:"20px 20px 0 0", padding:"20px 20px 32px", width:"100%", maxWidth:500 }} onClick={e=>e.stopPropagation()}>
              <div style={{ width:40, height:4, borderRadius:2, background:c.border, margin:"0 auto 16px" }}/>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:14 }}>➕ New Task</div>
              <input style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder="Task name *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} autoFocus />
              <input style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder="Description (optional)" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} />
              <input type="time" style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} />
              <select style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:16, outline:"none" }} value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </select>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setShowAdd(false)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, color:c.sub, padding:"12px", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
                <button onClick={addTask} style={{ flex:2, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:10, color:"#fff", padding:"12px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Add Task ✅</button>
              </div>
            </div>
          </div>
        )}

        {editModal&&(
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={()=>setEditModal(null)}>
            <div style={{ background:c.card, borderRadius:"20px 20px 0 0", padding:"20px 20px 32px", width:"100%", maxWidth:500 }} onClick={e=>e.stopPropagation()}>
              <div style={{ width:40, height:4, borderRadius:2, background:c.border, margin:"0 auto 16px" }}/>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>✏️ Edit Task</div>
              <div style={{ fontSize:12, color:c.sub, marginBottom:14 }}>{editModal.title}</div>
              <input style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder="Task name *" value={editForm.title} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} />
              <input style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder="Description" value={editForm.desc} onChange={e=>setEditForm(p=>({...p,desc:e.target.value}))} />
              <input type="time" style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:10, outline:"none" }} value={editForm.time} onChange={e=>setEditForm(p=>({...p,time:e.target.value}))} />
              <select style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:15, boxSizing:"border-box", marginBottom:16, outline:"none" }} value={editForm.priority} onChange={e=>setEditForm(p=>({...p,priority:e.target.value}))}>
                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </select>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setEditModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, color:c.sub, padding:"12px", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
                <button onClick={saveEdit} style={{ flex:2, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:10, color:"#fff", padding:"12px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Save ✅</button>
              </div>
            </div>
          </div>
        )}

        {rolloverModal&&(
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={()=>setRolloverModal(null)}>
            <div style={{ background:c.card, borderRadius:"20px 20px 0 0", padding:"20px 20px 32px", width:"100%", maxWidth:500 }} onClick={e=>e.stopPropagation()}>
              <div style={{ width:40, height:4, borderRadius:2, background:c.border, margin:"0 auto 16px" }}/>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>🔄 Move to Tomorrow</div>
              <div style={{ color:c.sub, fontSize:13, marginBottom:12 }}>"{rolloverModal.title}"</div>
              <textarea style={{ width:"100%", background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, padding:"11px 14px", color:c.text, fontSize:14, boxSizing:"border-box", minHeight:80, resize:"none", outline:"none", marginBottom:14 }} placeholder="Enter reason..." value={rolloverReason} onChange={e=>setRolloverReason(e.target.value)} />
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setRolloverModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:10, color:c.sub, padding:"12px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
                <button onClick={confirmRollover} style={{ flex:2, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:10, color:"#fff", padding:"12px", cursor:"pointer", fontWeight:700 }}>🔄 Move</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div style={{ display:"flex", height:"100svh", background:c.bg, color:c.text, fontFamily:"'Segoe UI',sans-serif", overflow:"hidden" }}>

      {toast && <div style={{ position:"fixed", top:18, left:"50%", transform:"translateX(-50%)", background:toast.type==="error"?c.red:toast.type==="appreciate"?c.accent2:c.green, color:"#fff", padding:"10px 22px", borderRadius:12, fontWeight:600, fontSize:14, zIndex:999, boxShadow:"0 4px 20px #0008", maxWidth:520, textAlign:"center" }}>{toast.msg}</div>}

      {sidebarOpen && (
        <div style={{ width:220, background:c.sidebar, borderRight:`1px solid ${c.border}`, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"18px 18px 14px", borderBottom:`1px solid ${c.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, background:`linear-gradient(135deg,${c.accent},${c.accent2})`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📋</div>
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:"#fff", lineHeight:1.2 }}>Daily Task</div>
                <div style={{ fontWeight:800, fontSize:13, color:c.accent, lineHeight:1.2 }}>Tracker</div>
              </div>
            </div>
          </div>
          <div style={{ padding:"10px" }}>
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", borderRadius:9, border:"none", cursor:"pointer", width:"100%", marginBottom:3, background:view===n.id?`linear-gradient(90deg,${c.accent}22,${c.accent2}11)`:"transparent", color:view===n.id?c.accent:c.sub, fontWeight:view===n.id?700:500, fontSize:13, borderLeft:view===n.id?`3px solid ${c.accent}`:"3px solid transparent" }}>
                <span style={{fontSize:15}}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${c.border}` }}>
            <div style={{ fontSize:13, color:"#a5b4fc", fontStyle:"italic", lineHeight:1.7 }}>"{quote}"</div>
          </div>
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${c.border}` }}>
            <button onClick={()=>setDarkMode(d=>!d)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:darkMode?"#ffffff12":"#6366f122", border:"none", borderRadius:9, padding:"7px 11px", cursor:"pointer", color:darkMode?"#fff":c.accent }}>
              <span style={{ fontSize:12, fontWeight:600 }}>{darkMode?"🌙 Dark Mode":"☀️ Light Mode"}</span>
              <div style={{ width:29,height:16,borderRadius:8,background:darkMode?c.accent:"#cbd5e1",position:"relative" }}>
                <div style={{ width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:darkMode?15:2,transition:"left 0.3s" }}/>
              </div>
            </button>
          </div>
        </div>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:`linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)`, padding:"11px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:7, color:"#fff", width:32, height:32, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{sidebarOpen?"◀":"▶"}</button>
            <div>
              <div style={{ fontSize:18, fontWeight:800 }}>{greeting}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Stay focused and keep pushing forward!</div>
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 14px", fontSize:13, fontWeight:700 }}>🔥 {streak} Day Streak</div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"16px 20px" }}>
          {view==="dashboard" && (<>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:13, marginBottom:16 }}>
              {[
                {label:"Total Tasks", value:allTotal, icon:"📋", color:c.accent, sub:"All tasks"},
                {label:"Completed", value:allDone, icon:"✅", color:c.green, sub:"All time"},
                {label:"Pending Today", value:pendingTasks.length, icon:"⏳", color:c.yellow, sub:"Due today"},
                {label:"Today's Rate", value:`${todayProgress}%`, icon:"📊", color:c.accent2, sub:`All-time: ${allTimeRate}%`},
              ].map((s,i)=>(
                <div key={i} style={{ background:c.card, borderRadius:13, padding:"14px 16px", border:`1px solid ${c.border}`, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-10, right:-10, fontSize:46, opacity:0.07 }}>{s.icon}</div>
                  <div style={{ fontSize:24, marginBottom:2 }}>{s.icon}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.label}</div>
                  <div style={{ fontSize:11, color:c.sub }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.8fr 1fr", gap:13 }}>
              <div style={{ background:c.card, borderRadius:13, padding:"14px", border:`1px solid ${c.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
                  <button onClick={()=>setView("tasks")} style={{ fontWeight:700, fontSize:14, background:"none", border:"none", color:c.text, cursor:"pointer", padding:0 }}>📋 Today's Tasks ↗</button>
                  <button onClick={()=>setShowAdd(true)} style={{ background:c.accent, border:"none", borderRadius:7, color:"#fff", padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" }}>+ Add</button>
                </div>
                <div style={{ marginBottom:11 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:c.sub, marginBottom:3 }}>
                    <span>{doneTasks.length}/{todayTasks.length} done today</span>
                    <span style={{ color:c.accent, fontWeight:700 }}>{todayProgress}%</span>
                  </div>
                  <div style={{ height:5, background:c.border, borderRadius:5 }}>
                    <div style={{ height:"100%", width:`${todayProgress}%`, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, borderRadius:5, transition:"width 0.5s" }}/>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:250, overflowY:"auto" }}>
                  {todayTasks.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:20, fontSize:13 }}>📭 No tasks — Add one!</div>}
                  {pendingTasks.map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:c.card2, borderRadius:9, borderLeft:`3px solid ${PRIORITY_COLOR[t.priority]}` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                        {t.desc&&<div style={{ fontSize:11, color:c.sub }}>{t.desc}</div>}
                        <div style={{ display:"flex", gap:5, marginTop:3 }}>
                          <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{t.priority}</span>
                          {t.time&&<span style={{ fontSize:10, color:c.sub }}>⏰{t.time}</span>}
                          {t.rolledOver&&<span style={{ fontSize:10, color:c.yellow }}>🔄</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:3 }}>
                        <button onClick={()=>completeTask(t.id)} style={ib("#22c55e22","#22c55e44",c.green)}>✓</button>
                        <button onClick={()=>openEdit(t)} style={ib("#6366f122","#6366f144",c.accent)}>✏️</button>
                        <button onClick={()=>{setRolloverModal(t);setRolloverReason("");}} style={ib("#f59e0b22","#f59e0b44",c.yellow)}>⟳</button>
                        <button onClick={()=>deleteTask(t.id)} style={ib("#ef444422","#ef444444",c.red)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {doneTasks.map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"#22c55e08", borderRadius:9, borderLeft:"3px solid #22c55e44", opacity:0.7 }}>
                      <div style={{ flex:1, fontWeight:600, fontSize:13, textDecoration:"line-through", color:c.sub }}>{t.title}</div>
                      <span>✅</span>
                    </div>
                  ))}
                </div>
                {todayTasks.length>0&&<button onClick={endDay} style={{ width:"100%", marginTop:9, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:9, color:"#fff", padding:"8px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🏁 Day End</button>}
              </div>
              <div style={{ background:c.card, borderRadius:13, padding:"14px", border:`1px solid ${c.border}` }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:11 }}>⚡ Activity</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                  {[...tasks].reverse().slice(0,12).map((t,i)=>(
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                      <div style={{ width:22, height:22, borderRadius:"50%", background:t.done?"#22c55e22":"#6366f122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>{t.done?"✅":"📌"}</div>
                      <div><div style={{ fontSize:12, fontWeight:600 }}>{t.title}</div><div style={{ fontSize:10, color:c.sub }}>{t.done?"Done":"Pending"} · {t.date}</div></div>
                    </div>
                  ))}
                  {tasks.length===0&&<div style={{ color:c.sub, fontSize:12, textAlign:"center", padding:20 }}>No activity</div>}
                </div>
              </div>
              <div style={{ background:c.card, borderRadius:13, padding:"14px", border:`1px solid ${c.border}` }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:11 }}>📈 Weekly</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100, marginBottom:7 }}>
                  {weeklyData.map((v,i)=>(
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ width:"100%", height:v>0?`${Math.round((v/maxWeekly)*100)}%`:4, minHeight:4, background:i===new Date().getDay()?`linear-gradient(180deg,${c.accent},${c.accent2})`:c.card2, borderRadius:"4px 4px 0 0" }}/>
                      <div style={{ fontSize:9, color:i===new Date().getDay()?c.accent:c.sub }}>{DAYS[i]}</div>
                    </div>
                  ))}
                </div>
                {[{label:"Completed",value:allDone,color:c.green,icon:"✅"},{label:"Pending",value:pendingTasks.length,color:c.yellow,icon:"⏳"},{label:"Streak",value:`${streak}d`,color:c.accent,icon:"🔥"}].map((s,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${c.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}><span>{s.icon}</span>{s.label}</div>
                    <span style={{ fontWeight:700, color:s.color, fontSize:13 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>)}

          {view==="tasks" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>☑ All Tasks</div>
                <button onClick={()=>setShowAdd(true)} style={{ background:c.accent, border:"none", borderRadius:9, color:"#fff", padding:"6px 15px", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New Task</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {tasks.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40 }}>📭 No tasks</div>}
                {tasks.map(t=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", background:c.card2, borderRadius:11, borderLeft:`4px solid ${t.done?"#22c55e66":PRIORITY_COLOR[t.priority]}`, opacity:t.done?0.7:1 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, textDecoration:t.done?"line-through":"none", color:t.done?c.sub:c.text }}>{t.title}</div>
                      {t.desc&&<div style={{ fontSize:12, color:c.sub }}>{t.desc}</div>}
                      <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                        <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 }}>{t.priority}</span>
                        {t.time&&<span style={{ fontSize:11, color:c.sub }}>⏰{t.time}</span>}
                        <span style={{ fontSize:11, color:c.sub }}>📅{t.date}</span>
                        {t.rolledOver&&<span style={{ background:"#f59e0b22", color:c.yellow, borderRadius:5, padding:"2px 7px", fontSize:11 }}>🔄Rolled</span>}
                      </div>
                    </div>
                    {!t.done?(
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>completeTask(t.id)} style={{ background:"#22c55e22", border:"1px solid #22c55e44", borderRadius:7, color:c.green, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:600 }}>✓ Done</button>
                        <button onClick={()=>openEdit(t)} style={{ background:"#6366f122", border:"1px solid #6366f144", borderRadius:7, color:c.accent, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>✏️</button>
                        <button onClick={()=>{setRolloverModal(t);setRolloverReason("");}} style={{ background:"#f59e0b22", border:"1px solid #f59e0b44", borderRadius:7, color:c.yellow, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>⟳</button>
                        <button onClick={()=>deleteTask(t.id)} style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:7, color:c.red, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    ):<span style={{ fontSize:18 }}>✅</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view==="calendar" && (
            <div style={{ background:c.card, borderRadius:13, padding:20, border:`1px solid ${c.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>📅 Calendar</div>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()-1); setCalendarMonth(d); }} style={{ background:c.card2, border:`1px solid ${c.border}`, borderRadius:7, color:c.text, width:29, height:29, cursor:"pointer", fontSize:14 }}>‹</button>
                  <div style={{ fontWeight:700, fontSize:15 }}>{calendarMonth.toLocaleString("default",{month:"long"})} {calendarMonth.getFullYear()}</div>
                  <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()+1); setCalendarMonth(d); }} style={{ background:c.card2, border:`1px solid ${c.border}`, borderRadius:7, color:c.text, width:29, height:29, cursor:"pointer", fontSize:14 }}>›</button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:6 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(<div key={i} style={{ textAlign:"center", fontSize:12, color:c.sub, fontWeight:700, padding:"5px 0" }}>{d}</div>))}
              </div>
              {(()=>{
                const yr=calendarMonth.getFullYear(), mo=calendarMonth.getMonth();
                const firstDay=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate();
                const todayD=new Date();
                const cells=[]; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
                const monthStr=`${yr}-${String(mo+1).padStart(2,"0")}`;
                const tasksByDay={};
                tasks.filter(t=>t.date&&t.date.startsWith(monthStr)).forEach(t=>{ const d=parseInt(t.date.split("-")[2]); if(!tasksByDay[d]) tasksByDay[d]=[]; tasksByDay[d].push(t); });
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
                    {cells.map((d,i)=>{
                      const isToday=d===todayD.getDate()&&mo===todayD.getMonth()&&yr===todayD.getFullYear();
                      const dayTasks=d?(tasksByDay[d]||[]):[];
                      return (
                        <div key={i} style={{ minHeight:72, borderRadius:9, background:isToday?`${c.accent}22`:d?c.card2:"transparent", border:`1px solid ${isToday?c.accent:"transparent"}`, padding:d?"6px":"" }}>
                          {d&&<><div style={{ fontWeight:isToday?800:500, fontSize:13, color:isToday?c.accent:c.text, marginBottom:3 }}>{d}</div>
                          {dayTasks.slice(0,2).map((t,ti)=>(<div key={ti} style={{ fontSize:10, background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:4, padding:"2px 5px", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>))}
                          {dayTasks.length>2&&<div style={{ fontSize:10, color:c.sub }}>+{dayTasks.length-2}</div>}</>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {view==="history" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:13 }}>◷ History</div>
              {history.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40 }}>📜 No history yet</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...history].reverse().map((h,i)=>(
                  <div key={i} style={{ padding:"10px 13px", background:c.card2, borderRadius:10, borderLeft:`4px solid ${h.type==="daily_summary"?c.accent:c.yellow}` }}>
                    {h.type==="daily_summary"?(<><div style={{ fontWeight:700, color:c.accent, fontSize:13 }}>📅 {h.date} — Summary</div><div style={{ fontSize:18, fontWeight:800 }}>{h.achievement}</div><div style={{ fontSize:12, color:c.sub }}>{h.done}/{h.total} Tasks</div></>):(<><div style={{ fontWeight:600, fontSize:13 }}>🔄 {h.title}</div><div style={{ fontSize:11, color:c.sub }}>{h.date} → {h.rolledTo}</div><div style={{ fontSize:11, color:c.yellow }}>Reason: {h.reason}</div></>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view==="achievements" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:13 }}>★ Achievements</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:13 }}>
                {[
                  {icon:"🔥",title:"Streak Master",desc:`${streak} days!`,unlocked:streak>=1,color:c.yellow},
                  {icon:"✅",title:"Task Crusher",desc:`${allDone} done!`,unlocked:allDone>=1,color:c.green},
                  {icon:"🏆",title:"Perfect Day",desc:"All done in a day!",unlocked:history.some(h=>h.type==="daily_summary"&&h.done===h.total),color:c.accent},
                  {icon:"⚡",title:"Speed Runner",desc:"5+ completed",unlocked:allDone>=5,color:c.accent2},
                  {icon:"📅",title:"Consistent",desc:"3+ day streak",unlocked:streak>=3,color:"#06b6d4"},
                  {icon:"🎯",title:"Goal Setter",desc:"10+ tasks",unlocked:tasks.length>=10,color:"#ec4899"},
                ].map((a,i)=>(
                  <div key={i} style={{ background:a.unlocked?`${a.color}15`:c.card2, borderRadius:11, padding:"16px", border:`1px solid ${a.unlocked?a.color+"44":c.border}`, textAlign:"center", opacity:a.unlocked?1:0.5 }}>
                    <div style={{ fontSize:32, marginBottom:6 }}>{a.icon}</div>
                    <div style={{ fontWeight:700, fontSize:14, color:a.unlocked?a.color:c.sub }}>{a.title}</div>
                    <div style={{ fontSize:12, color:c.sub }}>{a.desc}</div>
                    {!a.unlocked&&<div style={{ fontSize:11, marginTop:4 }}>🔒</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop FAB */}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:50 }}>
        <button onClick={()=>setShowAdd(true)} style={{ width:50, height:50, borderRadius:"50%", background:`linear-gradient(135deg,${c.accent},${c.accent2})`, border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:`0 4px 20px ${c.accent}66`, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      </div>

      {/* Desktop Modals */}
      {showAdd&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setShowAdd(false)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:410, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:16 }}>➕ New Task</div>
            {[{ph:"Task name *",key:"title"},{ph:"Description (optional)",key:"desc"}].map(f=>(<input key={f.key} style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />))}
            <input type="time" style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }} value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} />
            <select style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:16, outline:"none" }} value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowAdd(false)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={addTask} style={{ flex:1, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>Add Task ✅</button>
            </div>
          </div>
        </div>
      )}

      {editModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setEditModal(null)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:410, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>✏️ Edit Task</div>
            <div style={{ fontSize:12, color:c.sub, marginBottom:14 }}>{editModal.title}</div>
            {[{ph:"Task name *",key:"title"},{ph:"Description",key:"desc"}].map(f=>(<input key={f.key} style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }} placeholder={f.ph} value={editForm[f.key]} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} />))}
            <input type="time" style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }} value={editForm.time} onChange={e=>setEditForm(p=>({...p,time:e.target.value}))} />
            <select style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:16, outline:"none" }} value={editForm.priority} onChange={e=>setEditForm(p=>({...p,priority:e.target.value}))}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setEditModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>Save ✅</button>
            </div>
          </div>
        </div>
      )}

      {rolloverModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setRolloverModal(null)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:390, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>🔄 Rollover Task</div>
            <div style={{ color:c.sub, fontSize:14, marginBottom:13 }}>"{rolloverModal.title}"</div>
            <textarea style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", minHeight:72, resize:"vertical", outline:"none", marginBottom:13 }} placeholder="Enter reason..." value={rolloverReason} onChange={e=>setRolloverReason(e.target.value)} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setRolloverModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={confirmRollover} style={{ flex:1, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>🔄 Move</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
