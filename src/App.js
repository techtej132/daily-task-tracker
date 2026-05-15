import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

// ── FIREBASE CONFIG ──
const firebaseConfig = {
  apiKey: "AIzaSyBaA93iN6sNS9Iedtx4hwLH9-oERtDtb9E",
  authDomain: "daily-task-tracker-8653b.firebaseapp.com",
  projectId: "daily-task-tracker-8653b",
  storageBucket: "daily-task-tracker-8653b.firebasestorage.app",
  messagingSenderId: "793425605823",
  appId: "1:793425605823:web:3dd8732209aeb1fa6cc20a",
  measurementId: "G-G6BDTJG3CL"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const PRIORITY_BG = { High: "#ef444422", Medium: "#f59e0b22", Low: "#22c55e22" };
const MOTIVATIONAL = ["Discipline is the bridge between goals and accomplishment.", "Focus on progress, not perfection.", "One task at a time, success is near!", "Your effort today shapes tomorrow.", "Stay consistent, stay unstoppable!"];
const APPRECIATION = ["Well done! 🎉 Task completed!", "Excellent! 🌟 Keep it up!", "Fantastic! 🏆 You are the best!", "Amazing! 🎊 Keep going!"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getToday() { return new Date().toISOString().split("T")[0]; }

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", desc: "", time: "", priority: "Medium" });
  const [streak, setStreak] = useState(0);
  const [lastCompleteDate, setLastCompleteDate] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [rolloverModal, setRolloverModal] = useState(null);
  const [rolloverReason, setRolloverReason] = useState("");
  const [view, setView] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState([0,0,0,0,0,0,0]);
  const [exportOpen, setExportOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ title:"", desc:"", time:"", priority:"Medium" });
  const notifRef = useRef({});
  const [quote] = useState(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);

  // ── FIREBASE: Real-time listener ──
  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const today = getToday();
      const data = snapshot.docs.map(d => {
        const t = { id: d.id, ...d.data() };
        // Auto rollover overdue tasks
        if (!t.done && t.date && t.date < today) {
          updateDoc(doc(db, "tasks", t.id), { date: today, rolledOver: true, rolloverReason: t.rolloverReason || "Auto rolled over (overdue)" });
          return { ...t, date: today, rolledOver: true };
        }
        return t;
      });
      setTasks(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── FIREBASE: Load meta (streak, history, weeklyData) from localStorage ──
  useEffect(() => {
    try {
      const meta = JSON.parse(localStorage.getItem("taskapp_meta") || "{}");
      if (meta.streak) setStreak(meta.streak);
      if (meta.lastCompleteDate) setLastCompleteDate(meta.lastCompleteDate);
      if (meta.history) setHistory(meta.history);
      if (meta.weeklyData) setWeeklyData(meta.weeklyData);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("taskapp_meta", JSON.stringify({ streak, lastCompleteDate, history, weeklyData }));
    } catch {}
  }, [streak, lastCompleteDate, history, weeklyData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      tasks.forEach(t => {
        if (!t.done && t.time === hm && !notifRef.current[t.id]) {
          notifRef.current[t.id] = true;
          showToast(`⏰ "${t.title}" time is up!`, "remind");
          if (Notification.permission === "granted") new Notification("⏰ Task Reminder!", { body: t.title });
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => { if (Notification.permission === "default") Notification.requestPermission(); }, []);

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3500); }

  // ── FIREBASE CRUD ──
  async function addTask() {
    if (!form.title.trim()) return;
    try {
      await addDoc(collection(db, "tasks"), {
        title: form.title.trim(),
        desc: form.desc.trim(),
        time: form.time,
        priority: form.priority,
        done: false,
        date: getToday(),
        rolledOver: false,
        rolloverReason: "",
        createdAt: new Date().toISOString()
      });
      setForm({ title: "", desc: "", time: "", priority: "Medium" });
      setShowAdd(false);
      showToast("✅ Task added successfully!");
    } catch (e) {
      showToast("Error adding task!", "error");
    }
  }

  async function completeTask(id) {
    try {
      await updateDoc(doc(db, "tasks", id), { done: true });
      showToast(APPRECIATION[Math.floor(Math.random()*APPRECIATION.length)], "appreciate");
      const today = getToday();
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      if (lastCompleteDate !== today) {
        setStreak(s => lastCompleteDate===yest.toISOString().split("T")[0]||!lastCompleteDate ? s+1 : 1);
        setLastCompleteDate(today);
      }
      const day = new Date().getDay();
      setWeeklyData(prev => { const n=[...prev]; n[day]=(n[day]||0)+1; return n; });
    } catch { showToast("Error!", "error"); }
  }

  async function deleteTask(id) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      showToast("🗑️ Task deleted!");
    } catch { showToast("Error!", "error"); }
  }

  function openEdit(t) {
    setEditForm({ title: t.title, desc: t.desc||"", time: t.time||"", priority: t.priority });
    setEditModal(t);
  }

  async function saveEdit() {
    if (!editForm.title.trim()) { showToast("Title cannot be empty!", "error"); return; }
    try {
      await updateDoc(doc(db, "tasks", editModal.id), {
        title: editForm.title.trim(),
        desc: editForm.desc.trim(),
        time: editForm.time,
        priority: editForm.priority
      });
      setEditModal(null);
      showToast("✏️ Task updated successfully!");
    } catch { showToast("Error updating!", "error"); }
  }

  async function confirmRollover() {
    if (!rolloverReason.trim()) { showToast("Please enter a reason!", "error"); return; }
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    const tStr = tom.toISOString().split("T")[0];
    try {
      await updateDoc(doc(db, "tasks", rolloverModal.id), { date: tStr, rolledOver: true, rolloverReason });
      setHistory(prev => [...prev, { id: rolloverModal.id, title: rolloverModal.title, date: getToday(), rolledTo: tStr, reason: rolloverReason }]);
      setRolloverModal(null); setRolloverReason("");
      showToast("🔄 Task moved to tomorrow!");
    } catch { showToast("Error!", "error"); }
  }

  async function endDay() {
    const today = getToday();
    const todayT = tasks.filter(t => t.date===today);
    const done = todayT.filter(t => t.done).length;
    if (!todayT.length) { showToast("No tasks for today!", "error"); return; }
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    const tStr = tom.toISOString().split("T")[0];
    try {
      for (const t of todayT.filter(t => !t.done)) {
        await updateDoc(doc(db, "tasks", t.id), { date: tStr, rolledOver: true, rolloverReason: "Auto rolled over on Day End" });
      }
      setHistory(prev => [...prev, { type:"daily_summary", date: today, done, total: todayT.length, achievement: done===todayT.length?"Perfect Day! 🏆":done>todayT.length/2?"Good Job! 👍":"Keep Trying! 💪" }]);
      showToast(`🏁 Day ended! ${done}/${todayT.length} complete. Pending moved to tomorrow!`, "appreciate");
    } catch { showToast("Error!", "error"); }
  }

  // ── EXPORT ──
  function exportCSV() {
    const headers = ["Title","Description","Priority","Date","Time","Status","Rolled Over","Rollover Reason"];
    const rows = tasks.map(t => [`"${t.title}"`,`"${t.desc||""}"`,t.priority,t.date,t.time||"",t.done?"Completed":"Pending",t.rolledOver?"Yes":"No",`"${t.rolloverReason||""}"`]);
    const csv = [headers.join(","), ...rows.map(r=>r.join(","))].join("\n");
    download(new Blob([csv],{type:"text/csv"}), "tasks.csv");
    showToast("📊 CSV exported!");
  }

  function exportPDF() {
    const today = getToday();
    const allDoneCount = tasks.filter(t=>t.done).length;
    const html = `<html><head><title>Task Report</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;}
      h1{color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:8px;font-size:22px;}
      .summary{background:#f1f5f9;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:13px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#6366f1;color:#fff;padding:8px 10px;text-align:left;}
      td{padding:8px 10px;border-bottom:1px solid #e2e8f0;}
      tr:nth-child(even){background:#f8fafc;}
      .High{color:#ef4444;font-weight:bold;} .Medium{color:#f59e0b;font-weight:bold;} .Low{color:#22c55e;font-weight:bold;}
      .done{color:#22c55e;} .pending{color:#f59e0b;}
    </style></head><body>
    <h1>📋 Daily Task Tracker — Report</h1>
    <div class="summary">Generated: <b>${today}</b> &nbsp;|&nbsp; Total: <b>${tasks.length}</b> &nbsp;|&nbsp; Completed: <b>${allDoneCount}</b> &nbsp;|&nbsp; Pending: <b>${tasks.filter(t=>!t.done).length}</b> &nbsp;|&nbsp; Streak: <b>${streak} days</b></div>
    <table><tr><th>#</th><th>Task</th><th>Description</th><th>Priority</th><th>Date</th><th>Time</th><th>Status</th></tr>
    ${tasks.map((t,i)=>`<tr><td>${i+1}</td><td><b>${t.title}</b></td><td>${t.desc||"-"}</td><td class="${t.priority}">${t.priority}</td><td>${t.date}</td><td>${t.time||"-"}</td><td class="${t.done?"done":"pending"}">${t.done?"✅ Completed":"⏳ Pending"}</td></tr>`).join("")}
    </table></body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
    showToast("📄 PDF exported!");
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
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
  const greeting = greetHour<12?"Good Morning":greetHour<17?"Good Afternoon":"Good Evening";

  const c = {
    bg: darkMode?"#0f1117":"#f1f5f9", sidebar: darkMode?"#161b2e":"#1e2640",
    card: darkMode?"#1a2035":"#ffffff", card2: darkMode?"#1e2640":"#f8fafc",
    accent:"#6366f1", accent2:"#8b5cf6",
    text: darkMode?"#f1f5f9":"#1e293b", sub: darkMode?"#94a3b8":"#64748b",
    border: darkMode?"#ffffff12":"#e2e8f0",
    green:"#22c55e", yellow:"#f59e0b", red:"#ef4444"
  };

  const navItems = [
    {id:"dashboard", icon:"⊞", label:"Dashboard"},
    {id:"tasks",     icon:"☑", label:"Tasks"},
    {id:"calendar",  icon:"📅", label:"Calendar"},
    {id:"history",   icon:"◷", label:"History"},
    {id:"achievements", icon:"★", label:"Achievements"},
  ];

  const ib = (bg,bc,col) => ({ background:bg, border:`1px solid ${bc}`, borderRadius:6, color:col, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:600 });

  if (loading) return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:"#0f1117", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:40 }}>📋</div>
      <div style={{ color:"#6366f1", fontSize:18, fontWeight:700 }}>Daily Task Tracker</div>
      <div style={{ color:"#94a3b8", fontSize:14 }}>Loading your tasks...</div>
      <div style={{ width:40, height:40, border:"4px solid #6366f133", borderTop:"4px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:c.bg, color:c.text, fontFamily:"'Segoe UI',sans-serif", overflow:"hidden" }}>

      {toast && <div style={{ position:"fixed", top:18, left:"50%", transform:"translateX(-50%)", background:toast.type==="error"?c.red:toast.type==="remind"?c.yellow:toast.type==="appreciate"?c.accent2:c.green, color:"#fff", padding:"10px 22px", borderRadius:12, fontWeight:600, fontSize:14, zIndex:999, boxShadow:"0 4px 20px #0008", maxWidth:520, textAlign:"center" }}>{toast.msg}</div>}

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width:220, background:c.sidebar, borderRight:`1px solid ${c.border}`, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"18px 18px 14px", borderBottom:`1px solid ${c.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, background:`linear-gradient(135deg,${c.accent},${c.accent2})`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📋</div>
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:"#fff", lineHeight:1.2 }}>Daily Task</div>
                <div style={{ fontWeight:800, fontSize:13, color:c.accent, lineHeight:1.2 }}>Tracker</div>
              </div>
            </div>
          </div>

          <div style={{ padding:"10px", flexShrink:0 }}>
            {navItems.map(n => (
              <button key={n.id} onClick={()=>setView(n.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", borderRadius:9, border:"none", cursor:"pointer", width:"100%", marginBottom:3, background:view===n.id?`linear-gradient(90deg,${c.accent}22,${c.accent2}11)`:"transparent", color:view===n.id?c.accent:c.sub, fontWeight:view===n.id?700:500, fontSize:13, borderLeft:view===n.id?`3px solid ${c.accent}`:"3px solid transparent" }}>
                <span style={{fontSize:15}}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>

          <div style={{ padding:"0 10px 6px", flexShrink:0 }}>
            <button onClick={()=>setExportOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 11px", borderRadius:9, border:`1px solid ${c.border}`, cursor:"pointer", width:"100%", background:exportOpen?`${c.accent}22`:"transparent", color:exportOpen?c.accent:c.sub, fontWeight:600, fontSize:13 }}>
              <span>⬇ Export</span><span style={{fontSize:10}}>{exportOpen?"▲":"▼"}</span>
            </button>
            {exportOpen && (
              <div style={{ marginTop:4, background:c.card2, borderRadius:9, border:`1px solid ${c.border}`, overflow:"hidden" }}>
                {[{label:"PDF / Print",icon:"📄",action:exportPDF},{label:"Excel (CSV)",icon:"📊",action:exportCSV}].map((e,i)=>(
                  <button key={i} onClick={()=>{e.action();setExportOpen(false);}} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 13px", border:"none", borderBottom:i<1?`1px solid ${c.border}`:"none", cursor:"pointer", width:"100%", background:"transparent", color:c.text, fontSize:13, fontWeight:500 }}>
                    <span style={{fontSize:15}}>{e.icon}</span>{e.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex:1 }}/>

          <div style={{ padding:"12px 16px", borderTop:`1px solid ${c.border}`, flexShrink:0 }}>
            <div style={{ fontSize:13, color:"#a5b4fc", fontStyle:"italic", lineHeight:1.7, fontWeight:500 }}>"{quote}"</div>
          </div>

          {/* Mini Calendar */}
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${c.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()-1); setCalendarMonth(d); }} style={{ background:"none", border:"none", color:c.sub, cursor:"pointer", fontSize:14 }}>‹</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{calendarMonth.toLocaleString("default",{month:"short"})} {calendarMonth.getFullYear()}</div>
              <button onClick={()=>{ const d=new Date(calendarMonth); d.setMonth(d.getMonth()+1); setCalendarMonth(d); }} style={{ background:"none", border:"none", color:c.sub, cursor:"pointer", fontSize:14 }}>›</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:2 }}>
              {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:9, color:c.sub, fontWeight:600 }}>{d}</div>)}
            </div>
            {(()=>{
              const yr=calendarMonth.getFullYear(), mo=calendarMonth.getMonth();
              const firstDay=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate();
              const todayD=new Date();
              const cells=[]; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
              const taskDates=tasks.map(t=>t.date).filter(d=>d&&d.startsWith(`${yr}-${String(mo+1).padStart(2,"0")}`)).map(d=>parseInt(d.split("-")[2]));
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
                  {cells.map((d,i)=>{
                    const isToday=d===todayD.getDate()&&mo===todayD.getMonth()&&yr===todayD.getFullYear();
                    const hasTask=d&&taskDates.includes(d);
                    return (
                      <div key={i} style={{ textAlign:"center", fontSize:10, padding:"2px 0", borderRadius:4, background:isToday?c.accent:"transparent", color:isToday?"#fff":d?"#cbd5e1":"transparent", fontWeight:isToday?800:400 }}>
                        {d||""}
                        {hasTask&&!isToday&&<div style={{ width:3,height:3,borderRadius:"50%",background:c.accent2,margin:"0 auto" }}/>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div style={{ padding:"10px 14px", borderTop:`1px solid ${c.border}`, flexShrink:0 }}>
            <button onClick={()=>setDarkMode(d=>!d)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:darkMode?"#ffffff12":"#6366f122", border:"none", borderRadius:9, padding:"7px 11px", cursor:"pointer", color:darkMode?"#fff":c.accent }}>
              <span style={{ fontSize:12, fontWeight:600 }}>{darkMode?"🌙 Dark Mode":"☀️ Light Mode"}</span>
              <div style={{ width:29,height:16,borderRadius:8,background:darkMode?c.accent:"#cbd5e1",position:"relative" }}>
                <div style={{ width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:darkMode?15:2,transition:"left 0.3s" }}/>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        <div style={{ background:`linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)`, padding:"11px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:7, color:"#fff", width:32, height:32, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {sidebarOpen?"◀":"▶"}
            </button>
            <div>
              <div style={{ fontSize:18, fontWeight:800 }}>{greeting} 👋</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Stay focused and keep pushing forward!</div>
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 14px", fontSize:13, fontWeight:700 }}>🔥 {streak} Day Streak</div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"16px 20px" }}>

          {/* DASHBOARD */}
          {view==="dashboard" && (<>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:13, marginBottom:16 }}>
              {[
                {label:"Total Tasks", value:allTotal, icon:"📋", color:c.accent, sub:"All tasks added"},
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
                  {todayTasks.length===0 && <div style={{ textAlign:"center", color:c.sub, padding:20, fontSize:13 }}>📭 No tasks — Add one!</div>}
                  {pendingTasks.map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:c.card2, borderRadius:9, borderLeft:`3px solid ${PRIORITY_COLOR[t.priority]}` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                        {t.desc&&<div style={{ fontSize:11, color:c.sub }}>{t.desc}</div>}
                        <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
                          <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{t.priority}</span>
                          {t.time&&<span style={{ fontSize:10, color:c.sub }}>⏰ {t.time}</span>}
                          {t.rolledOver&&<span style={{ fontSize:10, color:c.yellow }}>🔄 Rolled</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                        <button onClick={()=>completeTask(t.id)} style={ib("#22c55e22","#22c55e44",c.green)}>✓</button>
                        <button onClick={()=>openEdit(t)} style={ib("#6366f122","#6366f144",c.accent)}>✏️</button>
                        <button onClick={()=>{setRolloverModal(t);setRolloverReason("");}} style={ib("#f59e0b22","#f59e0b44",c.yellow)}>⟳</button>
                        <button onClick={()=>deleteTask(t.id)} style={ib("#ef444422","#ef444444",c.red)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {doneTasks.map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"#22c55e08", borderRadius:9, borderLeft:`3px solid #22c55e44`, opacity:0.7 }}>
                      <div style={{ flex:1, fontWeight:600, fontSize:13, textDecoration:"line-through", color:c.sub }}>{t.title}</div>
                      <span>✅</span>
                    </div>
                  ))}
                </div>
                {todayTasks.length>0&&(
                  <button onClick={endDay} style={{ width:"100%", marginTop:9, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:9, color:"#fff", padding:"8px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🏁 Day End & Save Achievement</button>
                )}
              </div>

              <div style={{ background:c.card, borderRadius:13, padding:"14px", border:`1px solid ${c.border}` }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:11 }}>⚡ Activity Feed</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                  {[...tasks].slice(0,12).map((t,i)=>(
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                      <div style={{ width:24, height:24, borderRadius:"50%", background:t.done?"#22c55e22":"#6366f122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0 }}>{t.done?"✅":"📌"}</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{t.title}</div>
                        <div style={{ fontSize:10, color:c.sub }}>{t.done?"Completed":"Pending"} · {t.date}</div>
                      </div>
                    </div>
                  ))}
                  {tasks.length===0&&<div style={{ color:c.sub, fontSize:12, textAlign:"center", padding:20 }}>No activity yet</div>}
                </div>
              </div>

              <div style={{ background:c.card, borderRadius:13, padding:"14px", border:`1px solid ${c.border}` }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:11 }}>📈 Weekly Summary</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100, marginBottom:7 }}>
                  {weeklyData.map((v,i)=>(
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ width:"100%", height:v>0?`${Math.round((v/maxWeekly)*100)}%`:4, minHeight:4, background:i===new Date().getDay()?`linear-gradient(180deg,${c.accent},${c.accent2})`:c.card2, borderRadius:"4px 4px 0 0" }}/>
                      <div style={{ fontSize:9, color:i===new Date().getDay()?c.accent:c.sub, fontWeight:i===new Date().getDay()?700:400 }}>{DAYS[i]}</div>
                    </div>
                  ))}
                </div>
                {[
                  {label:"Completed",value:allDone,color:c.green,icon:"✅"},
                  {label:"Pending Today",value:pendingTasks.length,color:c.yellow,icon:"⏳"},
                  {label:"Streak",value:`${streak} days`,color:c.accent,icon:"🔥"},
                ].map((s,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${c.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}><span>{s.icon}</span>{s.label}</div>
                    <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>)}

          {/* TASKS */}
          {view==="tasks" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>☑ All Tasks</div>
                <button onClick={()=>setShowAdd(true)} style={{ background:c.accent, border:"none", borderRadius:9, color:"#fff", padding:"6px 15px", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New Task</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {tasks.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40, fontSize:15 }}>📭 No tasks found</div>}
                {tasks.map(t=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", background:c.card2, borderRadius:11, borderLeft:`4px solid ${t.done?"#22c55e66":PRIORITY_COLOR[t.priority]}`, opacity:t.done?0.7:1 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, textDecoration:t.done?"line-through":"none", color:t.done?c.sub:c.text }}>{t.title}</div>
                      {t.desc&&<div style={{ fontSize:12, color:c.sub, marginTop:2 }}>{t.desc}</div>}
                      <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                        <span style={{ background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 }}>{t.priority}</span>
                        {t.time&&<span style={{ fontSize:11, color:c.sub }}>⏰ {t.time}</span>}
                        <span style={{ fontSize:11, color:c.sub }}>📅 {t.date}</span>
                        {t.rolledOver&&<span style={{ background:"#f59e0b22", color:c.yellow, borderRadius:5, padding:"2px 7px", fontSize:11 }}>🔄 Rolled</span>}
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

          {/* CALENDAR */}
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
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                  <div key={i} style={{ textAlign:"center", fontSize:12, color:c.sub, fontWeight:700, padding:"5px 0" }}>{d}</div>
                ))}
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
                          {d&&<>
                            <div style={{ fontWeight:isToday?800:500, fontSize:13, color:isToday?c.accent:c.text, marginBottom:3 }}>{d}</div>
                            {dayTasks.slice(0,2).map((t,ti)=>(
                              <div key={ti} style={{ fontSize:10, background:PRIORITY_BG[t.priority], color:PRIORITY_COLOR[t.priority], borderRadius:4, padding:"2px 5px", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                            ))}
                            {dayTasks.length>2&&<div style={{ fontSize:10, color:c.sub }}>+{dayTasks.length-2} more</div>}
                          </>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* HISTORY */}
          {view==="history" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:13 }}>◷ History</div>
              {history.length===0&&<div style={{ textAlign:"center", color:c.sub, padding:40 }}>📜 No history yet</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...history].reverse().map((h,i)=>(
                  <div key={i} style={{ padding:"10px 13px", background:c.card2, borderRadius:10, borderLeft:`4px solid ${h.type==="daily_summary"?c.accent:c.yellow}` }}>
                    {h.type==="daily_summary"?(
                      <>
                        <div style={{ fontWeight:700, color:c.accent, fontSize:13 }}>📅 {h.date} — Daily Summary</div>
                        <div style={{ fontSize:19, fontWeight:800, marginTop:3 }}>{h.achievement}</div>
                        <div style={{ fontSize:12, color:c.sub, marginTop:2 }}>{h.done}/{h.total} Tasks Complete</div>
                      </>
                    ):(
                      <>
                        <div style={{ fontWeight:600, fontSize:13 }}>🔄 {h.title}</div>
                        <div style={{ fontSize:11, color:c.sub, marginTop:2 }}>{h.date} → {h.rolledTo}</div>
                        <div style={{ fontSize:11, color:c.yellow, marginTop:2 }}>Reason: {h.reason}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {view==="achievements" && (
            <div style={{ background:c.card, borderRadius:13, padding:16, border:`1px solid ${c.border}` }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:13 }}>★ Achievements</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:13 }}>
                {[
                  {icon:"🔥",title:"Streak Master",desc:`${streak} days streak!`,unlocked:streak>=1,color:c.yellow},
                  {icon:"✅",title:"Task Crusher",desc:`${allDone} tasks complete!`,unlocked:allDone>=1,color:c.green},
                  {icon:"🏆",title:"Perfect Day",desc:"All tasks done in a day!",unlocked:history.some(h=>h.type==="daily_summary"&&h.done===h.total),color:c.accent},
                  {icon:"⚡",title:"Speed Runner",desc:"5+ tasks completed",unlocked:allDone>=5,color:c.accent2},
                  {icon:"📅",title:"Consistent",desc:"3+ day streak",unlocked:streak>=3,color:"#06b6d4"},
                  {icon:"🎯",title:"Goal Setter",desc:"10+ tasks added",unlocked:tasks.length>=10,color:"#ec4899"},
                ].map((a,i)=>(
                  <div key={i} style={{ background:a.unlocked?`${a.color}15`:c.card2, borderRadius:11, padding:"16px", border:`1px solid ${a.unlocked?a.color+"44":c.border}`, textAlign:"center", opacity:a.unlocked?1:0.5 }}>
                    <div style={{ fontSize:32, marginBottom:6 }}>{a.icon}</div>
                    <div style={{ fontWeight:700, fontSize:14, color:a.unlocked?a.color:c.sub }}>{a.title}</div>
                    <div style={{ fontSize:12, color:c.sub, marginTop:3 }}>{a.desc}</div>
                    {!a.unlocked&&<div style={{ fontSize:11, marginTop:4, color:c.sub }}>🔒 Locked</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:50 }}>
        {fabOpen&&(
          <div style={{ position:"absolute", bottom:60, right:0, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
            {[
              {label:"Add Task", icon:"➕", action:()=>{setShowAdd(true);setFabOpen(false);}},
              {label:"Day End",  icon:"🏁", action:()=>{endDay();setFabOpen(false);}},
            ].map((f,i)=>(
              <button key={i} onClick={f.action} style={{ display:"flex", alignItems:"center", gap:8, background:c.card, border:`1px solid ${c.border}`, borderRadius:10, padding:"7px 14px", color:c.text, fontSize:13, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 16px #0006", whiteSpace:"nowrap" }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        )}
        <button onClick={()=>setFabOpen(o=>!o)} style={{ width:50, height:50, borderRadius:"50%", background:`linear-gradient(135deg,${c.accent},${c.accent2})`, border:"none", color:"#fff", fontSize:22, cursor:"pointer", boxShadow:`0 4px 20px ${c.accent}66`, display:"flex", alignItems:"center", justifyContent:"center", transform:fabOpen?"rotate(45deg)":"rotate(0)", transition:"transform 0.3s" }}>+</button>
      </div>

      {/* Add Task Modal */}
      {showAdd&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setShowAdd(false)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:410, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:16 }}>➕ New Task</div>
            {[{ph:"Task name *",key:"title"},{ph:"Description (optional)",key:"desc"}].map(f=>(
              <input key={f.key} style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }}
                placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
            ))}
            <input type="time" style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }}
              value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} />
            <select style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:16, outline:"none" }}
              value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowAdd(false)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={addTask} style={{ flex:1, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>Add Task ✅</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setEditModal(null)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:410, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>✏️ Edit Task</div>
            <div style={{ fontSize:12, color:c.sub, marginBottom:14 }}>Editing: <b style={{color:c.accent}}>{editModal.title}</b></div>
            {[{ph:"Task name *",key:"title"},{ph:"Description (optional)",key:"desc"}].map(f=>(
              <input key={f.key} style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }}
                placeholder={f.ph} value={editForm[f.key]} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} />
            ))}
            <input type="time" style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:10, outline:"none" }}
              value={editForm.time} onChange={e=>setEditForm(p=>({...p,time:e.target.value}))} />
            <select style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", marginBottom:16, outline:"none" }}
              value={editForm.priority} onChange={e=>setEditForm(p=>({...p,priority:e.target.value}))}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setEditModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, background:`linear-gradient(90deg,${c.accent},${c.accent2})`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>Save Changes ✅</button>
            </div>
          </div>
        </div>
      )}

      {/* Rollover Modal */}
      {rolloverModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={()=>setRolloverModal(null)}>
          <div style={{ background:c.card, borderRadius:17, padding:24, width:390, border:`1px solid ${c.border}` }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>🔄 Rollover Task</div>
            <div style={{ color:c.sub, fontSize:14, marginBottom:13 }}>Move "{rolloverModal.title}" to tomorrow</div>
            <textarea style={{ width:"100%", background:darkMode?"#0f1117":c.card2, border:`1px solid ${c.border}`, borderRadius:8, padding:"9px 12px", color:c.text, fontSize:14, boxSizing:"border-box", minHeight:72, resize:"vertical", outline:"none", marginBottom:13 }}
              placeholder="Enter reason..." value={rolloverReason} onChange={e=>setRolloverReason(e.target.value)} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setRolloverModal(null)} style={{ flex:1, background:c.card2, border:`1px solid ${c.border}`, borderRadius:8, color:c.sub, padding:"10px", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={confirmRollover} style={{ flex:1, background:`linear-gradient(90deg,${c.yellow},#f97316)`, border:"none", borderRadius:8, color:"#fff", padding:"10px", cursor:"pointer", fontWeight:700 }}>🔄 Move to Tomorrow</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
