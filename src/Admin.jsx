import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { 
  getFarms, createFarm, getTips, addTip, 
  getApiKeys, ingestTelemetry, resetDatabase 
} from "./api";

// ── Brand Colors (matching FarmDashboard exactly) ─────────────────────────
// Green:  #1a9c3e  Blue: #1d9cd3  Yellow: #f5c518  Red: #e8471a

const BRAND_PALETTE = ["#1a9c3e", "#1d9cd3", "#f5c518", "#e8471a", "#9b51e0", "#00b4d8", "#2ec4b6"];
const NODE_COLORS = {
  NODE_01:"#1a9c3e", NODE_02:"#1d9cd3", NODE_03:"#f5c518", NODE_04:"#e8471a",
};
const getNodeColor = (id, idx = 0) => NODE_COLORS[id] || BRAND_PALETTE[idx % BRAND_PALETTE.length];

const genHistory = () => Array.from({length:24},(_,i)=>({
  h:i+"h",
  hum:  0,
  temp: 0,
  ec:   0,
}));

// ── CSS — matches FarmDashboard theme exactly ─────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  :root {
    --green:      #1a9c3e;
    --green-dark: #157a30;
    --green-pale: #e8f7ed;
    --green-mid:  #c3e8cf;
    --blue:       #1d9cd3;
    --blue-dark:  #1580ae;
    --blue-pale:  #e6f5fb;
    --blue-mid:   #b3dff0;
    --yellow:     #f5c518;
    --yellow-pale:#fffbe6;
    --yellow-mid: #fde68a;
    --red:        #e8471a;
    --red-pale:   #fef0ec;
    --red-mid:    #f9c4b5;
    --bg:         #f7f9f7;
    --surface:    #ffffff;
    --border:     #e2ebe4;
    --divider:    #ddeee2;
    --text:       #0d2416;
    --muted:      #5a7a65;
    --muted2:     #8aa892;
    --sans:       'Nunito Sans', sans-serif;
    --display:    'Nunito', sans-serif;
  }

  body {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  .layout { display:flex; min-height:100vh; }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 236px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top:0; left:0; bottom:0;
    z-index: 50;
  }

  .sidebar-brand {
    padding: 0 20px;
    height: 68px;
    display: flex;
    align-items: center;
    border-bottom: 3px solid var(--green);
    gap: 12px;
  }

  .brand-logo-mini {
    display:flex; align-items:center; gap:8px;
  }

  .dot-grid {
    display:grid; grid-template-columns:repeat(3,1fr); gap:2.5px; width:24px;
  }

  .dg { width:6px; height:6px; border-radius:50%; }
  .dg-g { background:var(--green); }
  .dg-b { background:var(--blue); }
  .dg-y { background:var(--yellow); }

  .brand-text-main {
    font-family: var(--display);
    font-weight: 800;
    font-size: 13px;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: .06em;
    line-height: 1;
  }

  .brand-text-sub {
    font-family: var(--display);
    font-weight: 700;
    font-size: 10px;
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: .08em;
    line-height: 1;
    margin-top: 2px;
  }

  .ops-tag {
    margin-left: auto;
    background: var(--green-pale);
    border: 1px solid var(--green-mid);
    color: var(--green-dark);
    font-family: var(--display);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .08em;
    padding: 3px 8px;
    border-radius: 20px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .sidebar-nav {
    padding: 16px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;
  }

  .nav-group-label {
    font-family: var(--display);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .14em;
    color: var(--muted2);
    text-transform: uppercase;
    padding: 14px 8px 5px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-family: var(--display);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    transition: all .15s;
    position: relative;
  }

  .nav-item:hover { background:var(--green-pale); color:var(--green); }

  .nav-item.active {
    background: var(--green-pale);
    color: var(--green);
    font-weight: 700;
  }

  .nav-item.active::before {
    content:'';
    position:absolute;
    left:0; top:4px; bottom:4px;
    width:3px;
    background:var(--green);
    border-radius:0 3px 3px 0;
  }

  .nav-icon { font-size:15px; width:18px; text-align:center; }

  .nav-badge {
    margin-left: auto;
    font-family: var(--display);
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 20px;
  }

  .nav-badge.red    { background:var(--red-pale);   color:var(--red);   border:1px solid var(--red-mid); }
  .nav-badge.blue   { background:var(--blue-pale);  color:var(--blue);  border:1px solid var(--blue-mid); }
  .nav-badge.green  { background:var(--green-pale); color:var(--green); border:1px solid var(--green-mid); }

  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }

  .admin-row {
    display:flex; align-items:center; gap:10px;
  }

  .admin-avatar {
    width:32px; height:32px;
    border-radius:50%;
    background:linear-gradient(135deg,var(--green),var(--blue));
    display:flex; align-items:center; justify-content:center;
    font-family:var(--display); font-weight:800; font-size:12px; color:#fff;
    flex-shrink:0;
  }

  .admin-name { font-family:var(--display); font-weight:700; font-size:12px; color:var(--text); }
  .admin-role { font-size:11px; color:var(--muted); }

  /* ── MAIN ── */
  .main-content { margin-left:236px; flex:1; display:flex; flex-direction:column; }

  .top-bar {
    height:56px;
    background:var(--surface);
    border-bottom:1px solid var(--border);
    padding:0 28px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    position:sticky; top:0; z-index:40;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }

  .page-title {
    font-family:var(--display);
    font-size:16px;
    font-weight:800;
    color:var(--text);
  }

  .top-right { display:flex; align-items:center; gap:12px; }

  .tb-pill {
    display:flex; align-items:center; gap:6px;
    background:var(--bg);
    border:1px solid var(--border);
    border-radius:20px;
    padding:5px 12px;
    font-family:var(--display);
    font-size:12px;
    font-weight:600;
    color:var(--muted);
  }

  .live-dot {
    width:7px; height:7px; border-radius:50%;
    background:var(--green);
    box-shadow:0 0 0 2px var(--green-mid);
    animation:livepulse 2s infinite;
  }

  .alert-dot {
    width:7px; height:7px; border-radius:50%;
    background:var(--red);
    animation:blink 1.2s infinite;
  }

  @keyframes livepulse { 0%,100%{box-shadow:0 0 0 2px var(--green-mid);}50%{box-shadow:0 0 0 5px rgba(26,156,62,.15);} }
  @keyframes blink { 0%,100%{opacity:1;}50%{opacity:.3;} }

  .page-content { padding:28px; flex:1; }

  /* ── CARDS ── */
  .card {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:12px;
    padding:22px;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }

  .card-title {
    font-family:var(--display);
    font-size:14px;
    font-weight:800;
    color:var(--text);
    margin-bottom:2px;
  }

  .card-sub { font-size:12px; color:var(--muted); margin-bottom:18px; }

  /* ── STAT STRIP ── */
  .stat-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }

  .stat-tile {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:12px;
    padding:18px 20px;
    position:relative;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }

  .stat-tile-bar {
    position:absolute; left:0; top:0; bottom:0;
    width:4px;
    border-radius:12px 0 0 12px;
  }

  .stat-label {
    font-family:var(--display);
    font-size:10px; font-weight:800;
    color:var(--muted);
    text-transform:uppercase; letter-spacing:.08em;
    padding-left:10px; margin-bottom:6px;
  }

  .stat-val {
    font-family:var(--display);
    font-size:32px; font-weight:800;
    line-height:1; padding-left:10px;
  }

  .stat-detail { font-size:11px; color:var(--muted); padding-left:10px; margin-top:3px; }

  /* ── SECTION HEADING ── */
  .section-h {
    font-family:var(--display);
    font-size:11px; font-weight:800;
    text-transform:uppercase; letter-spacing:.1em;
    color:var(--muted);
    display:flex; align-items:center; gap:8px;
    margin-bottom:12px;
  }

  .section-h::before {
    content:'';
    width:3px; height:14px;
    background:var(--green);
    border-radius:2px;
    flex-shrink:0;
  }

  /* ── STATUS BADGES ── */
  .badge {
    font-family:var(--display);
    font-size:10px; font-weight:800;
    padding:3px 9px; border-radius:20px;
    display:inline-block; text-transform:uppercase; letter-spacing:.04em;
  }

  .badge.active    { background:var(--green-pale); color:var(--green-dark); border:1px solid var(--green-mid); }
  .badge.attention { background:var(--yellow-pale);color:#9a7a00;           border:1px solid var(--yellow-mid);}
  .badge.inactive  { background:var(--bg);         color:var(--muted2);     border:1px solid var(--border); }
  .badge.urgent    { background:var(--red-pale);   color:var(--red);        border:1px solid var(--red-mid); }
  .badge.warning   { background:var(--yellow-pale);color:#9a7a00;           border:1px solid var(--yellow-mid);}
  .badge.good      { background:var(--green-pale); color:var(--green-dark); border:1px solid var(--green-mid);}
  .badge.info      { background:var(--blue-pale);  color:var(--blue-dark);  border:1px solid var(--blue-mid); }

  /* ── FARM TABLE ── */
  .farm-list { display:flex; flex-direction:column; gap:2px; }

  .farm-header {
    display:grid;
    grid-template-columns:32px 1.8fr 1fr 0.7fr 90px 80px 110px 100px;
    gap:12px; padding:7px 14px;
    font-family:var(--display);
    font-size:10px; font-weight:800;
    text-transform:uppercase; letter-spacing:.08em;
    color:var(--muted2);
  }

  .farm-row {
    display:grid;
    grid-template-columns:32px 1.8fr 1fr 0.7fr 90px 80px 110px 100px;
    gap:12px;
    padding:11px 14px;
    border-radius:8px;
    cursor:pointer;
    border:1px solid transparent;
    transition:all .15s;
    align-items:center;
  }

  .farm-row:hover { background:var(--green-pale); border-color:var(--green-mid); }
  .farm-row.sel   { background:var(--green-pale); border-color:var(--green-mid); }

  .farm-num { font-family:var(--display); font-size:11px; font-weight:700; color:var(--muted2); text-align:center; }
  .farm-name { font-family:var(--display); font-weight:700; font-size:13px; color:var(--text); }
  .farm-id   { font-size:10px; color:var(--muted); margin-top:1px; }
  .farm-loc  { font-size:12px; color:var(--muted); }
  .farm-size { font-size:12px; font-weight:600; color:var(--text); }

  .node-dots { display:flex; gap:4px; align-items:center; }
  .ndot { width:8px; height:8px; border-radius:50%; }

  .alert-num { font-family:var(--display); font-size:13px; font-weight:800; text-align:center; }

  /* ── DRAWER ── */
  .overlay {
    position:fixed; inset:0;
    background:rgba(13,36,22,.35);
    z-index:90;
    animation:fadeIn .2s ease;
  }

  @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }

  .drawer {
    position:fixed;
    top:0; right:0; bottom:0;
    width:700px;
    background:var(--surface);
    border-left:1px solid var(--border);
    z-index:100;
    display:flex;
    flex-direction:column;
    animation:slideIn .22s ease;
    box-shadow:-8px 0 32px rgba(13,36,22,.12);
  }

  @keyframes slideIn { from{transform:translateX(30px);opacity:0;}to{transform:none;opacity:1;} }

  .drawer-head {
    padding:20px 24px;
    border-bottom:1px solid var(--border);
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    flex-shrink:0;
  }

  .drawer-title {
    font-family:var(--display);
    font-size:20px; font-weight:800;
    color:var(--text); margin-bottom:4px;
  }

  .drawer-meta {
    display:flex; flex-wrap:wrap; gap:10px;
    font-size:12px; color:var(--muted); margin-top:6px;
  }

  .drawer-meta span { display:flex; align-items:center; gap:4px; }

  .close-btn {
    background:var(--bg);
    border:1px solid var(--border);
    color:var(--muted);
    width:32px; height:32px;
    border-radius:8px;
    cursor:pointer;
    font-size:16px;
    flex-shrink:0;
    transition:all .15s;
    display:flex; align-items:center; justify-content:center;
  }

  .close-btn:hover { background:var(--red-pale); color:var(--red); border-color:var(--red-mid); }

  .drawer-tabs {
    display:flex;
    border-bottom:1px solid var(--border);
    padding:0 24px;
    flex-shrink:0;
    gap:2px;
  }

  .dtab {
    padding:10px 16px;
    font-family:var(--display);
    font-size:12px; font-weight:700;
    color:var(--muted);
    cursor:pointer; border:none; background:none;
    position:relative; transition:color .15s;
    text-transform:uppercase; letter-spacing:.04em;
  }

  .dtab:hover { color:var(--green); }
  .dtab.active { color:var(--green); }
  .dtab.active::after {
    content:''; position:absolute;
    bottom:-1px; left:0; right:0;
    height:3px; background:var(--green);
    border-radius:3px 3px 0 0;
  }

  .drawer-body {
    flex:1; overflow-y:auto; padding:22px 24px;
    scrollbar-width:thin; scrollbar-color:var(--border) transparent;
  }

  /* ── SENSOR MINI ── */
  .smini-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }

  .smini {
    background:var(--bg);
    border:1.5px solid var(--border);
    border-radius:10px; padding:14px;
    position:relative; overflow:hidden;
    transition:border-color .2s;
  }

  .smini:hover { border-color:var(--green-mid); }
  .smini-bar { position:absolute; top:0;left:0;right:0; height:3px; border-radius:10px 10px 0 0; }
  .smini-node { font-family:var(--display); font-size:10px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:6px 0 10px; }
  .smini-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .smini-key { font-size:11px; color:var(--muted); font-weight:600; }
  .smini-val { font-family:var(--display); font-size:14px; font-weight:800; }
  .smini-bar-wrap { height:4px; background:var(--border); border-radius:2px; overflow:hidden; margin-top:2px; }
  .smini-bar-fill { height:100%; border-radius:2px; }

  /* ── DATA TABLE ── */
  .dtable { width:100%; border-collapse:collapse; }
  .dtable th {
    font-family:var(--display); font-size:9px; font-weight:800;
    text-transform:uppercase; letter-spacing:.1em;
    color:var(--muted2); padding:7px 10px; text-align:left;
    border-bottom:2px solid var(--border);
  }
  .dtable td { font-size:12px; padding:10px; border-bottom:1px solid var(--border); color:var(--text); }
  .dtable tr:hover td { background:var(--green-pale); }
  .dtable .mono { font-size:11px; color:var(--muted); }
  .dtable .strong { font-family:var(--display); font-weight:700; color:var(--green); }

  /* ── TIPS ── */
  .tip-item {
    background:var(--bg);
    border:1.5px solid var(--border);
    border-radius:10px; padding:14px 16px;
    margin-bottom:10px; position:relative; overflow:hidden;
  }

  .tip-item::before {
    content:''; position:absolute;
    left:0; top:0; bottom:0; width:4px;
    border-radius:10px 0 0 10px;
  }

  .tip-item.urgent::before  { background:var(--red); }
  .tip-item.warning::before { background:var(--yellow); }
  .tip-item.good::before    { background:var(--green); }
  .tip-item.info::before    { background:var(--blue); }

  .tip-meta { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:11px; color:var(--muted); }
  .tip-author { font-family:var(--display); font-weight:800; color:var(--green-dark); }
  .tip-text { font-size:13px; color:var(--text); line-height:1.55; }

  .tip-del {
    position:absolute; top:10px; right:10px;
    background:none; border:none;
    color:var(--muted2); cursor:pointer; font-size:13px;
    border-radius:4px; padding:2px 5px;
    transition:all .15s;
  }

  .tip-del:hover { background:var(--red-pale); color:var(--red); }

  /* ── FORMS ── */
  .tip-form {
    background:var(--bg); border:1.5px solid var(--border);
    border-radius:10px; padding:18px; margin-bottom:20px;
  }

  .form-row { display:flex; gap:10px; margin-bottom:10px; }
  .form-field { flex:1; }

  .form-label {
    font-family:var(--display); font-size:10px; font-weight:800;
    text-transform:uppercase; letter-spacing:.08em;
    color:var(--muted); display:block; margin-bottom:4px;
  }

  .form-input, .form-select, .form-textarea {
    width:100%; padding:9px 12px;
    background:var(--surface); border:1.5px solid var(--border);
    border-radius:8px; color:var(--text);
    font-family:var(--sans); font-size:13px;
    outline:none; transition:border-color .2s;
  }

  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color:var(--green); }
  .form-textarea { resize:vertical; min-height:80px; }

  .send-btn {
    background:var(--green); color:#fff;
    border:none; border-radius:8px;
    padding:9px 22px;
    font-family:var(--display); font-size:13px; font-weight:800;
    cursor:pointer; transition:background .2s;
    letter-spacing:.02em;
  }

  .send-btn:hover { background:var(--green-dark); }

  /* ── ALERT CARDS ── */
  .alert-card {
    display:flex; align-items:flex-start; gap:12px;
    border-radius:10px; padding:14px 18px;
    border:1.5px solid; margin-bottom:10px;
  }

  .alert-card.danger  { background:var(--red-pale);    border-color:var(--red-mid); }
  .alert-card.warning { background:var(--yellow-pale); border-color:var(--yellow-mid); }
  .alert-card.ok      { background:var(--green-pale);  border-color:var(--green-mid); }
  .alert-card.info    { background:var(--blue-pale);   border-color:var(--blue-mid); }

  .alert-icon { font-size:22px; flex-shrink:0; margin-top:1px; }
  .alert-title { font-family:var(--display); font-weight:700; font-size:13px; color:var(--text); margin-bottom:3px; }
  .alert-desc { font-size:12px; color:var(--muted); line-height:1.5; }

  /* ── TOGGLE BTN ── */
  .toggle-btn {
    padding:6px 16px; border-radius:20px;
    border:1.5px solid var(--border);
    background:var(--surface);
    font-family:var(--display); font-size:12px; font-weight:700;
    color:var(--muted); cursor:pointer; transition:all .2s;
  }

  .toggle-btn:hover { border-color:var(--green); color:var(--green); }
  .toggle-btn.active { background:var(--green); border-color:var(--green); color:#fff; }

  /* ── ANALYTICS ── */
  .analytics-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }

  /* ── TIPS PAGE GRID ── */
  .tips-pg { display:grid; grid-template-columns:1fr 340px; gap:20px; }

  .agro-tip-row {
    display:flex; align-items:flex-start; gap:12px;
    background:var(--bg); border:1.5px solid var(--border);
    border-radius:10px; padding:14px 16px; margin-bottom:8px;
    transition:border-color .2s;
  }

  .agro-tip-row:hover { border-color:var(--green-mid); }
  .agro-num { font-family:var(--display); font-size:11px; font-weight:800; color:var(--green); width:22px; flex-shrink:0; }
  .agro-text { font-size:13px; color:var(--text); line-height:1.55; flex:1; }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }

  @media(max-width:1100px){
    .stat-strip { grid-template-columns:repeat(2,1fr); }
    .analytics-grid { grid-template-columns:1fr; }
    .tips-pg { grid-template-columns:1fr; }
    .drawer { width:100%; }
  }
`;

// ── Tooltip ───────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label, unit="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#0d2416",borderRadius:10,padding:"10px 14px",
      fontFamily:"Nunito Sans,sans-serif",fontSize:12,color:"#fff",
      boxShadow:"0 8px 24px rgba(0,0,0,.2)",border:"1px solid rgba(26,156,62,.3)"}}>
      <div style={{color:"#74c99a",marginBottom:6,fontWeight:700}}>{label}</div>
      {payload.map(p=>(
        <div key={p.name} style={{color:p.color,marginBottom:3,fontWeight:600}}>
          {p.name}: <span style={{color:"#fff"}}>{typeof p.value==="number"?p.value.toFixed(1):p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
};

// ── Logo ──────────────────────────────────────────────────────────────────
const Logo = () => (
  <div className="brand-logo-mini">
    <div className="dot-grid">
      <div className="dg dg-g"/><div className="dg dg-b"/><div className="dg dg-y"/>
      <div className="dg dg-b"/><div className="dg dg-g"/><div className="dg dg-g"/>
      <div className="dg dg-y"/><div className="dg dg-b"/><div className="dg dg-g"/>
    </div>
    <div>
      <div className="brand-text-main">Future</div>
      <div className="brand-text-sub">Solutions Ltd</div>
    </div>
  </div>
);

const daysSince = ds => {
  if (!ds) return null;
  const d = (Date.now() - new Date(ds)) / 86400000;
  return d > 0 ? Math.floor(d) : null;
};

// ── Farm Drawer ───────────────────────────────────────────────────────────
function FarmDrawer({ farm, onClose }) {
  const [dtab, setDtab]   = useState("overview");
  const [tips, setTips]   = useState(farm.tips);
  const [newTip, setNew]  = useState({ text:"", type:"info", author:"Future Solutions" });
  const [history]         = useState(genHistory());
  const nodeColArr        = ["#1a9c3e","#1d9cd3","#f5c518","#e8471a"];

  const addTip = () => {
    if (!newTip.text.trim()) return;
    setTips(p=>[{id:Date.now(), date:new Date().toISOString().slice(0,10),
      author:newTip.author, text:newTip.text, type:newTip.type},...p]);
    setNew(p=>({...p,text:""}));
  };

  const HARVEST = {Maize:120,Tomato:90,Cassava:270,Rice:180,Pepper:90,
    Cowpea:75,Sorghum:120,Groundnut:100,Tea:365,Millet:90};

  const DTABS = [["overview","Overview"],["sensors","Sensors"],
    ["crops","Crops"],["tips","Tips & Recs"],["analytics","Analytics"]];

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{farm.name}</div>
            <span className={`badge ${farm.status}`} style={{marginBottom:6,display:"inline-block"}}>{farm.status}</span>
            <div className="drawer-meta">
              <span>📍 {farm.location}</span>
              <span>📐 {farm.size_ha} ha</span>
              <span>📱 {farm.phone}</span>
              <span>🆔 {farm.id}</span>
              <span>📅 Since {farm.joined}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-tabs">
          {DTABS.map(([k,v])=>(
            <button key={k} className={`dtab ${dtab===k?"active":""}`} onClick={()=>setDtab(k)}>{v}</button>
          ))}
        </div>

        <div className="drawer-body">

          {/* OVERVIEW */}
          {dtab==="overview" && <>
            <div className="section-h">Live Sensor Readings</div>
            <div className="smini-grid">
              {farm.nodes.map((n,i)=>{
                const hum=n.sensor_json?.humidity||0;
                const humCol=hum<30?"var(--red)":hum<40?"var(--yellow)":"var(--green)";
                const col=nodeColArr[i]||"#1a9c3e";
                return (
                  <div key={n.node_id} className="smini">
                    <div className="smini-bar" style={{background:col}}/>
                    <div className="smini-node">
                      {n.node_id}
                      {!n.active && <span style={{color:"var(--red)",marginLeft:4}}>● Offline</span>}
                    </div>
                    <div className="smini-row">
                      <span className="smini-key">Humidity</span>
                      <span className="smini-val" style={{color:humCol}}>{hum.toFixed(1)}%</span>
                    </div>
                    <div className="smini-bar-wrap">
                      <div className="smini-bar-fill" style={{width:`${hum}%`,background:humCol}}/>
                    </div>
                    <div className="smini-row" style={{marginTop:6}}>
                      <span className="smini-key">Temp</span>
                      <span className="smini-val" style={{color:"var(--blue)"}}>{(n.sensor_json?.temp_c||0).toFixed(1)}°C</span>
                    </div>
                    <div className="smini-row">
                      <span className="smini-key">EC</span>
                      <span className="smini-val">{(n.sensor_json?.ec||0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="section-h">Planted Crops</div>
            <table className="dtable" style={{marginBottom:20}}>
              <thead><tr><th>Node</th><th>Crop</th><th>Planted</th><th>Days</th><th>Area</th></tr></thead>
              <tbody>
                {farm.crops.map(c=>(
                  <tr key={c.node}>
                    <td className="mono">{c.node}</td>
                    <td className="strong">{c.crop}</td>
                    <td className="mono">{c.planted}</td>
                    <td className="mono">{daysSince(c.planted)??";"}d</td>
                    <td className="mono">{c.area_ha} ha</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-h">Latest Tips ({tips.length})</div>
            {tips.length===0
              ? <div style={{fontSize:12,color:"var(--muted)",padding:"12px 0"}}>No tips sent yet.</div>
              : tips.slice(0,2).map(t=>(
                <div key={t.id} className={`tip-item ${t.type}`}>
                  <div className="tip-meta">
                    <span className="tip-author">{t.author}</span>
                    <span>·</span><span>{t.date}</span>
                    <span className={`badge ${t.type}`} style={{marginLeft:"auto",padding:"1px 7px",fontSize:9}}>{t.type}</span>
                  </div>
                  <div className="tip-text">{t.text}</div>
                </div>
              ))
            }
          </>}

          {/* SENSORS */}
          {dtab==="sensors" && <>
            <div className="section-h">24h Sensor Trend</div>
            <ResponsiveContainer width="100%" height={200} style={{marginBottom:20}}>
              <LineChart data={history} margin={{top:5,right:5,left:-20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
                <XAxis dataKey="h" tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}} interval={3}/>
                <YAxis tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <Tooltip content={<Tip/>}/>
                <Legend wrapperStyle={{fontSize:12,fontFamily:"Nunito Sans",fontWeight:600}}/>
                <Line dataKey="hum"  name="Humidity%" stroke="#1a9c3e" strokeWidth={2.5} dot={false}/>
                <Line dataKey="temp" name="Temp°C"    stroke="#1d9cd3" strokeWidth={2.5} dot={false}/>
                <Line dataKey="ec"   name="EC mS/cm"  stroke="#f5c518" strokeWidth={2}   dot={false}/>
              </LineChart>
            </ResponsiveContainer>
            <div className="section-h">All Node Readings</div>
            <table className="dtable">
              <thead><tr><th>Node</th><th>Status</th><th>Humidity</th><th>Temp</th><th>EC</th><th>Uptime</th><th>Messages</th></tr></thead>
              <tbody>
                {farm.nodes.map(n=>{
                  const hum=n.sensor_json?.humidity||0;
                  return (
                    <tr key={n.node_id}>
                      <td className="mono">{n.node_id}</td>
                      <td><span className={`badge ${n.active?"active":"inactive"}`}>{n.active?"Live":"Offline"}</span></td>
                      <td><span style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,
                        color:hum<40?"var(--red)":"var(--green)"}}>{hum.toFixed(1)}%</span></td>
                      <td className="mono">{(n.sensor_json?.temp_c||0).toFixed(1)}°C</td>
                      <td className="mono">{(n.sensor_json?.ec||0).toFixed(2)}</td>
                      <td className="mono">{Math.floor(n.uptime_s/3600)}h {Math.floor((n.uptime_s%3600)/60)}m</td>
                      <td className="mono">{n.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>}

          {/* CROPS */}
          {dtab==="crops" && <>
            <div className="section-h">Crop Details</div>
            <table className="dtable">
              <thead><tr><th>Node</th><th>Crop</th><th>Planted</th><th>Days Growing</th><th>Area</th><th>Est. Harvest</th></tr></thead>
              <tbody>
                {farm.crops.map(c=>{
                  const d=daysSince(c.planted);
                  const hd=HARVEST[c.crop]||120;
                  const rem=d!==null?Math.max(0,hd-d):null;
                  return (
                    <tr key={c.node}>
                      <td className="mono">{c.node}</td>
                      <td className="strong">{c.crop}</td>
                      <td className="mono">{c.planted}</td>
                      <td className="mono">{d??";"} days</td>
                      <td className="mono">{c.area_ha} ha</td>
                      <td>
                        {rem!==null
                          ? <span className={`badge ${rem===0?"good":"info"}`}>{rem===0?"✓ Ready":rem+" days"}</span>
                          : ";"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>}

          {/* TIPS */}
          {dtab==="tips" && <>
            <div className="tip-form">
              <div style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,color:"var(--text)",marginBottom:14,textTransform:"uppercase",letterSpacing:".06em"}}>
                Send Recommendation to {farm.name}
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">From</label>
                  <input className="form-input" value={newTip.author}
                    onChange={e=>setNew(p=>({...p,author:e.target.value}))}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={newTip.type}
                    onChange={e=>setNew(p=>({...p,type:e.target.value}))}>
                    <option value="info">Info</option>
                    <option value="good">Good news</option>
                    <option value="warning">Warning</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label className="form-label">Message</label>
                <textarea className="form-textarea" placeholder="Write your recommendation for this farmer…"
                  value={newTip.text} onChange={e=>setNew(p=>({...p,text:e.target.value}))}/>
              </div>
              <button className="send-btn" onClick={addTip}>Send Recommendation →</button>
            </div>

            <div className="section-h">Recommendation History ({tips.length})</div>
            {tips.length===0
              ? <div style={{fontSize:12,color:"var(--muted)",padding:"12px 0"}}>No tips sent yet.</div>
              : tips.map(t=>(
                <div key={t.id} className={`tip-item ${t.type}`}>
                  <button className="tip-del" onClick={()=>setTips(p=>p.filter(x=>x.id!==t.id))}>✕</button>
                  <div className="tip-meta">
                    <span className="tip-author">{t.author}</span>
                    <span>·</span><span>{t.date}</span>
                    <span className={`badge ${t.type}`} style={{marginLeft:"auto",padding:"1px 7px",fontSize:9}}>{t.type}</span>
                  </div>
                  <div className="tip-text">{t.text}</div>
                </div>
              ))
            }
          </>}

          {/* ANALYTICS */}
          {dtab==="analytics" && <>
            <div className="section-h">Humidity Trend</div>
            <ResponsiveContainer width="100%" height={190} style={{marginBottom:20}}>
              <AreaChart data={history.slice(0,14)} margin={{top:5,right:5,left:-20,bottom:5}}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a9c3e" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#1a9c3e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
                <XAxis dataKey="h" tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <YAxis domain={[0,100]} tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine y={40} stroke="var(--yellow)" strokeDasharray="4 4"
                  label={{value:"Threshold",fill:"#9a7a00",fontSize:10,fontWeight:700}}/>
                <Area dataKey="hum" name="Humidity%" stroke="#1a9c3e" fill="url(#ag)" strokeWidth={2.5} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>

            <div className="section-h">Field Health Radar</div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={[
                {m:"Humidity", v:Math.round(farm.nodes.reduce((a,n)=>a+(n.sensor_json?.humidity||0),0)/farm.nodes.length)},
                {m:"Nutrients",v:Math.round(100-(farm.nodes.reduce((a,n)=>a+(n.sensor_json?.ec||0),0)/farm.nodes.length)*15)},
                {m:"Temp OK",  v:Math.round(farm.nodes.reduce((a,n)=>a+(n.sensor_json?.temp_c<32?100:40),0)/farm.nodes.length)},
                {m:"Uptime",   v:Math.round(farm.nodes.filter(n=>n.active).length/farm.nodes.length*100)},
                {m:"Coverage", v:80},
              ]}>
                <PolarGrid stroke="var(--divider)"/>
                <PolarAngleAxis dataKey="m" tick={{fill:"var(--muted)",fontSize:11,fontFamily:"Nunito Sans",fontWeight:600}}/>
                <PolarRadiusAxis domain={[0,100]} tick={{fill:"var(--muted2)",fontSize:8}} tickCount={3}/>
                <Radar dataKey="v" stroke="#1a9c3e" fill="#1a9c3e" fillOpacity={0.15} strokeWidth={2.5}/>
              </RadarChart>
            </ResponsiveContainer>
          </>}
        </div>
      </div>
    </>
  );
}

// ── Overview Page ─────────────────────────────────────────────────────────
function OverviewPage({ farms = [] }) {
  const totalAlerts = farms.reduce((a,f)=>a+(f.alerts||0),0);
  const active      = farms.filter(f=>f.status==="active").length;
  const nodes       = farms.reduce((a,f)=>a+(f.nodes ? f.nodes.length : 0),0);
  const liveNodes   = farms.reduce((a,f)=>a+(f.nodes ? f.nodes.filter(n=>n.active).length : 0),0);
  const allHum      = farms.flatMap(f=>(f.nodes || []).map(n=>n.sensor_json?.humidity||0));
  const avgHum      = allHum.length ? (allHum.reduce((a,v)=>a+v,0)/allHum.length).toFixed(1) : "0.0";

  const fleetTrend = Array.from({length:24},(_,i)=>({
    h:i+"h",
    hum:  0,
    alerts: 0,
  }));

  const attentionFarms = farms.filter(f => (f.alerts > 0 || f.status === "attention"));

  return (
    <div>
      <div className="stat-strip">
        {[
          {label:"Total Farms",   val:farms.length, detail:`${active} active`,         color:"var(--green)"},
          {label:"Live Nodes",    val:`${liveNodes}/${nodes}`, detail:"Sensors online", color:"var(--blue)"},
          {label:"Open Alerts",   val:totalAlerts, detail:"Across all farms",           color:totalAlerts>0?"var(--red)":"var(--green)"},
          {label:"Avg Humidity",  val:`${avgHum}%`, detail:"Fleet-wide average",        color:"var(--yellow)"},
        ].map(s=>(
          <div key={s.label} className="stat-tile">
            <div className="stat-tile-bar" style={{background:s.color}}/>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-detail">{s.detail}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:20}}>
        <div className="card">
          <div className="card-title">Fleet Humidity 24h</div>
          <div className="card-sub">Average across all active farms</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={fleetTrend} margin={{top:5,right:5,left:-20,bottom:5}}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a9c3e" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#1a9c3e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
              <XAxis dataKey="h" tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}} interval={4}/>
              <YAxis domain={[0,100]} tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}} unit="%"/>
              <Tooltip content={<Tip unit="%"/>}/>
              <Area dataKey="hum" name="Avg Humidity" stroke="#1a9c3e" fill="url(#fg)" strokeWidth={2.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Alert Activity 24h</div>
          <div className="card-sub">Open alerts across all farms</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={fleetTrend} margin={{top:5,right:5,left:-20,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
              <XAxis dataKey="h" tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}} interval={4}/>
              <YAxis tick={{fontSize:9,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="alerts" name="Alerts" fill="#e8471a" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Farms Needing Attention</div>
        <div className="card-sub">Farms with open alerts or offline sensors</div>
        {farms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted)", fontSize: 13 }}>
            No farms registered yet. Click on <strong>Farms</strong> in the sidebar to add your first farm.
          </div>
        ) : attentionFarms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted)", fontSize: 13 }}>
            🌿 All {farms.length} farms are operating within normal parameters.
          </div>
        ) : (
          attentionFarms.map(f=>(
            <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",
              background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)",marginBottom:8}}>
              <span className={`badge ${f.status}`}>{f.status}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,color:"var(--text)"}}>{f.name}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{f.location} · {f.id}</div>
              </div>
              {f.alerts>0 && (
                <span className="badge urgent">{f.alerts} alert{f.alerts>1?"s":""}</span>
              )}
              <div className="node-dots">
                {(f.nodes || []).map((n,i)=>(
                  <div key={i} className="ndot" style={{
                    background:n.active?"var(--green)":"var(--red)",
                    boxShadow:n.active?"0 0 5px var(--green)":"none"}}/>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Farms Page ────────────────────────────────────────────────────────────
function FarmsPage({ farms = [], onRefresh }) {
  const [sel, setSel]             = useState(null);
  const [filter, setFil]          = useState("all");
  const [showAdd, setShowAdd]     = useState(false);
  const [isSubmitting, setIsSub]  = useState(false);
  const [newFarm, setNewFarm]     = useState({ id:"", name:"", location:"DR Congo", size_ha:2.5, phone:"", status:"active" });

  const filtered = farms.filter(f=>filter==="all"||f.status===filter);

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (!newFarm.id.trim() || !newFarm.name.trim()) {
      alert("Please provide Farm ID and Name");
      return;
    }
    setIsSub(true);
    try {
      await createFarm(newFarm);
      setShowAdd(false);
      setNewFarm({ id:"", name:"", location:"DR Congo", size_ha:2.5, phone:"", status:"active" });
      if (onRefresh) await onRefresh();
    } catch(err) {
      alert("Failed to create farm: " + err.message);
    } finally {
      setIsSub(false);
    }
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{display:"flex",gap:8}}>
          {["all","active","attention","inactive"].map(f=>(
            <button key={f} className={`toggle-btn ${filter===f?"active":""}`} onClick={()=>setFil(f)}
              style={{textTransform:"capitalize"}}>{f}</button>
          ))}
        </div>
        <button 
          onClick={()=>setShowAdd(true)}
          style={{
            background:"var(--green)",color:"#fff",border:"none",padding:"8px 16px",
            borderRadius:8,fontWeight:700,fontFamily:"Nunito,sans-serif",fontSize:13,cursor:"pointer",
            display:"flex",alignItems:"center",gap:6
          }}>
          + Add New Farm
        </button>
      </div>

      {showAdd && (
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:20,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:14,marginBottom:12}}>Register New Farm</div>
          <form onSubmit={handleCreateFarm} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>
            <div>
              <label className="form-label">Farm ID (e.g. FSL-005)</label>
              <input className="form-input" required value={newFarm.id} onChange={e=>setNewFarm({...newFarm, id: e.target.value})}/>
            </div>
            <div>
              <label className="form-label">Farmer / Farm Name</label>
              <input className="form-input" required value={newFarm.name} onChange={e=>setNewFarm({...newFarm, name: e.target.value})}/>
            </div>
            <div>
              <label className="form-label">Location</label>
              <input className="form-input" value={newFarm.location} onChange={e=>setNewFarm({...newFarm, location: e.target.value})}/>
            </div>
            <div>
              <label className="form-label">Size (hectares)</label>
              <input className="form-input" type="number" step="0.1" value={newFarm.size_ha} onChange={e=>setNewFarm({...newFarm, size_ha: e.target.value})}/>
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={newFarm.phone} onChange={e=>setNewFarm({...newFarm, phone: e.target.value})}/>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
              <button type="submit" disabled={isSubmitting} className="send-btn" style={{flex:1}}>
                {isSubmitting ? "Saving..." : "Save Farm"}
              </button>
              <button type="button" onClick={()=>setShowAdd(false)} style={{background:"var(--bg)",border:"1px solid var(--border)",padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="farm-list">
          <div className="farm-header">
            <div>#</div><div>Farmer</div><div>Location</div><div>Size</div>
            <div>Nodes</div><div>Alerts</div><div>Status</div><div>Joined</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)",fontSize:13}}>
              No farms registered in this category. Click "+ Add New Farm" above to register one.
            </div>
          ) : (
            filtered.map((f,i)=>(
              <div key={f.id} className={`farm-row ${sel?.id===f.id?"sel":""}`} onClick={()=>setSel(f)}>
                <div className="farm-num">{i+1}</div>
                <div>
                  <div className="farm-name">{f.name}</div>
                  <div className="farm-id">{f.id}</div>
                </div>
                <div className="farm-loc">{f.location}</div>
                <div className="farm-size">{f.size_ha} ha</div>
                <div className="node-dots">
                  {(f.nodes || []).map((n,j)=>(
                    <div key={j} className="ndot" style={{
                      background:n.active?"var(--green)":"var(--red)",
                      boxShadow:n.active?"0 0 5px var(--green)":"none"}}/>
                  ))}
                  <span style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:10,color:"var(--muted)",marginLeft:4}}>
                    {(f.nodes || []).filter(n=>n.active).length}/{(f.nodes || []).length}
                  </span>
                </div>
                <div className="alert-num" style={{color:f.alerts>0?"var(--red)":"var(--muted)"}}>
                  {f.alerts>0?`⚠ ${f.alerts}`:"-"}
                </div>
                <div><span className={`badge ${f.status}`}>{f.status}</span></div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{f.joined}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {sel && <FarmDrawer farm={sel} onClose={()=>setSel(null)}/>}
    </div>
  );
}

// ── Analytics Page ────────────────────────────────────────────────────────
function AnalyticsPage({ farms = [] }) {
  const farmHum = farms.map(f=>{
    const nds = f.nodes || [];
    const avg = nds.length ? +(nds.reduce((a,n)=>a+(n.sensor_json?.humidity||0),0)/nds.length).toFixed(1) : 0;
    return { name: f.name ? f.name.split(" ")[0] : f.id, avg };
  });
  const farmEC = farms.map(f=>{
    const nds = f.nodes || [];
    const ec = nds.length ? +(nds.reduce((a,n)=>a+(n.sensor_json?.ec||0),0)/nds.length).toFixed(2) : 0;
    return { name: f.name ? f.name.split(" ")[0] : f.id, ec };
  });

  const growth = Array.from({length:12},(_,i)=>({
    month:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
    farms: farms.length,
    alerts: farms.reduce((acc, f)=>acc+(f.alerts||0), 0),
  }));

  const cropMap = {};
  farms.forEach(f=>(f.crops || []).forEach(c=>{cropMap[c.crop]=(cropMap[c.crop]||0)+(c.area_ha||0);}));
  const total = Object.values(cropMap).reduce((a,v)=>a+v,0) || 1;
  const cropColors = ["#1a9c3e","#1d9cd3","#f5c518","#e8471a","#22c252","#a855f7"];

  return (
    <div>
      <div className="analytics-grid">
        <div className="card">
          <div className="card-title">Average Humidity by Farm</div>
          <div className="card-sub">Current average across active nodes</div>
          {farms.length === 0 ? (
            <div style={{textAlign:"center",padding:"48px 0",color:"var(--muted)",fontSize:12}}>No farm data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={farmHum} margin={{top:5,right:5,left:-20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
                <XAxis dataKey="name" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <YAxis domain={[0,100]} tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}} unit="%"/>
                <Tooltip content={<Tip unit="%"/>}/>
                <ReferenceLine y={40} stroke="var(--yellow)" strokeDasharray="4 4"
                  label={{value:"Threshold",fill:"#9a7a00",fontSize:10,fontWeight:700}}/>
                <Bar dataKey="avg" name="Avg Humidity" fill="#1a9c3e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">EC Levels by Farm</div>
          <div className="card-sub">Ideal range: 1.0–3.0 mS/cm</div>
          {farms.length === 0 ? (
            <div style={{textAlign:"center",padding:"48px 0",color:"var(--muted)",fontSize:12}}>No EC data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={farmEC} margin={{top:5,right:5,left:-20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
                <XAxis dataKey="name" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <YAxis tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine y={3.0} stroke="var(--red)"    strokeDasharray="4 3" label={{value:"Max",fill:"var(--red)",   fontSize:10,fontWeight:700}}/>
                <ReferenceLine y={1.0} stroke="var(--yellow)" strokeDasharray="4 3" label={{value:"Min",fill:"#9a7a00",fontSize:10,fontWeight:700}}/>
                <Bar dataKey="ec" name="Avg EC" fill="#1d9cd3" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">Platform Growth</div>
          <div className="card-sub">Total farms registered and active alerts</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growth} margin={{top:5,right:5,left:-20,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
              <XAxis dataKey="month" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
              <YAxis tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
              <Tooltip content={<Tip/>}/>
              <Legend wrapperStyle={{fontSize:12,fontFamily:"Nunito Sans",fontWeight:600}}/>
              <Line dataKey="farms"  name="Farms"  stroke="#1a9c3e" strokeWidth={2.5} dot={{r:3,fill:"#1a9c3e"}}/>
              <Line dataKey="alerts" name="Alerts" stroke="#e8471a" strokeWidth={2}   dot={{r:3,fill:"#e8471a"}} strokeDasharray="5 3"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Crop Distribution</div>
          <div className="card-sub">Hectares planted per crop type across all farms</div>
          <div style={{paddingTop:8}}>
            {Object.keys(cropMap).length === 0 ? (
              <div style={{textAlign:"center",padding:"36px 0",color:"var(--muted)",fontSize:12}}>No crops recorded across farms yet</div>
            ) : (
              Object.entries(cropMap).map(([crop,area],i)=>(
                <div key={crop} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,color:"var(--text)"}}>{crop}</span>
                    <span style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>{area.toFixed(1)} ha</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:"var(--divider)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(area/total*100).toFixed(0)}%`,
                      background:cropColors[i%cropColors.length],borderRadius:3,
                      transition:"width .6s ease"}}/>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ingest & API Keys Page ───────────────────────────────────────────────────
function ApiKeysPage({ farms = [], onRefresh }) {
  const [apiKeyInfo, setApiKeyInfo] = useState(null);
  const [testPayload, setTestPayload] = useState({
    node_id: "NODE_01",
    farm_id: farms[0]?.id || "",
    temp_c: 24.5,
    humidity: 62.0,
    ec: 1.85,
    uptime_s: 3600,
  });
  const [simResult, setSimResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snippetTab, setSnippetTab] = useState("curl");

  useEffect(() => {
    getApiKeys().then(data => setApiKeyInfo(data));
  }, []);

  const activeKey = apiKeyInfo?.active_key || "fsl_live_7a9f8b2c4e1d6a0e";

  const copyKey = () => {
    navigator.clipboard.writeText(activeKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulate = async () => {
    setSending(true);
    setSimResult(null);
    try {
      const res = await ingestTelemetry(testPayload, activeKey);
      setSimResult({ success: true, data: res });
      if (onRefresh) onRefresh();
    } catch(err) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const snippets = {
    curl: `curl -X POST "https://your-domain.com/api/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKey}" \\
  -d '{
    "node_id": "${testPayload.node_id}",
    "temp_c": ${testPayload.temp_c},
    "humidity": ${testPayload.humidity},
    "ec": ${testPayload.ec},
    "uptime_s": ${testPayload.uptime_s}
  }'`,
    python: `import requests

url = "https://your-domain.com/api/ingest"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${activeKey}"
}
payload = {
    "node_id": "${testPayload.node_id}",
    "temp_c": ${testPayload.temp_c},
    "humidity": ${testPayload.humidity},
    "ec": ${testPayload.ec},
    "uptime_s": ${testPayload.uptime_s}
}

response = requests.post(url, json=payload, headers=headers)
print("Response:", response.status_code, response.json())`,
    esp32: `#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "https://your-domain.com/api/ingest";
const char* apiKey = "${activeKey}";

void sendTelemetry(float temp, float hum, float ec) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);

    String json = "{\\"node_id\\":\\"${testPayload.node_id}\\",\\"temp_c\\":" + String(temp) + 
                  ",\\"humidity\\":" + String(hum) + ",\\"ec\\":" + String(ec) + "}";
    int httpResponseCode = http.POST(json);
    http.end();
  }
}`
  };

  return (
    <div>
      {/* API KEY CARD */}
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-title">Active Device Ingestion API Key</div>
        <div className="card-sub">Authenticate field sensors, gateway stations, and backend data pushers</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:12}}>
          <div style={{
            background:"var(--bg)",padding:"10px 16px",borderRadius:8,border:"1px solid var(--border)",
            fontFamily:"monospace",fontSize:14,fontWeight:700,color:"var(--green-dark)",flex:1,letterSpacing:".05em"
          }}>
            {activeKey}
          </div>
          <button 
            onClick={copyKey}
            style={{
              background: copied ? "var(--green-dark)" : "var(--green)",color:"#fff",border:"none",
              padding:"10px 18px",borderRadius:8,fontWeight:700,fontFamily:"Nunito,sans-serif",fontSize:13,cursor:"pointer"
            }}>
            {copied ? "✓ Copied!" : "Copy Key"}
          </button>
        </div>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>
          Include this key in HTTP headers using either <code>X-API-Key: {activeKey}</code> or <code>Authorization: Bearer {activeKey}</code>.
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
        {/* INGEST SIMULATOR */}
        <div className="card">
          <div className="card-title">📡 Test Ingestion Simulator</div>
          <div className="card-sub">Directly push a sensor packet to test database ingestion and dashboard reactivity</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label className="form-label">Node ID</label>
              <input className="form-input" value={testPayload.node_id} onChange={e=>setTestPayload({...testPayload, node_id:e.target.value})}/>
            </div>
            <div>
              <label className="form-label">Assign Farm (optional)</label>
              <select className="form-select" value={testPayload.farm_id} onChange={e=>setTestPayload({...testPayload, farm_id:e.target.value})}>
                <option value="">None (Unassigned)</option>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Soil Humidity (%)</label>
              <input className="form-input" type="number" step="0.1" value={testPayload.humidity} onChange={e=>setTestPayload({...testPayload, humidity:Number(e.target.value)})}/>
            </div>
            <div>
              <label className="form-label">Soil Temperature (°C)</label>
              <input className="form-input" type="number" step="0.1" value={testPayload.temp_c} onChange={e=>setTestPayload({...testPayload, temp_c:Number(e.target.value)})}/>
            </div>
            <div>
              <label className="form-label">EC (mS/cm)</label>
              <input className="form-input" type="number" step="0.05" value={testPayload.ec} onChange={e=>setTestPayload({...testPayload, ec:Number(e.target.value)})}/>
            </div>
            <div>
              <label className="form-label">Uptime (seconds)</label>
              <input className="form-input" type="number" value={testPayload.uptime_s} onChange={e=>setTestPayload({...testPayload, uptime_s:Number(e.target.value)})}/>
            </div>
          </div>

          <button 
            onClick={handleSimulate} 
            disabled={sending}
            className="send-btn" 
            style={{width:"100%"}}>
            {sending ? "Transmitting to Database..." : "🚀 Push Telemetry Packet to Database"}
          </button>

          {simResult && (
            <div style={{
              marginTop:14,padding:12,borderRadius:8,fontSize:12,
              background: simResult.success ? "var(--green-pale)" : "var(--red-pale)",
              color: simResult.success ? "var(--green-dark)" : "var(--red)",
              border: `1px solid ${simResult.success ? "var(--green-mid)" : "var(--red-mid)"}`
            }}>
              {simResult.success ? (
                <div>
                  <strong>✓ Telemetry Saved!</strong> Node <code>{testPayload.node_id}</code> is now registered and active.
                </div>
              ) : (
                <div><strong>Error:</strong> {simResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* CODE SNIPPETS */}
        <div className="card">
          <div className="card-title">Integration Code Snippets</div>
          <div className="card-sub">Copy-paste ready scripts to connect microcontrollers or gateways</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["curl", "python", "esp32"].map(tab => (
              <button 
                key={tab} 
                onClick={()=>setSnippetTab(tab)}
                className={`toggle-btn ${snippetTab===tab ? "active" : ""}`}
                style={{textTransform:"uppercase",fontSize:11}}>
                {tab}
              </button>
            ))}
          </div>
          <pre style={{
            background:"#13241b",color:"#e8f7ed",padding:14,borderRadius:8,
            fontSize:11,fontFamily:"monospace",overflowX:"auto",lineHeight:1.4,maxHeight:240
          }}>
            {snippets[snippetTab]}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── Tips Library Page ─────────────────────────────────────────────────────
function TipsPage({ tips = [], farms = [], onRefresh }) {
  const [newText, setNewText] = useState("");
  const [recipient, setRec]   = useState("all");
  const [author, setAuthor]   = useState("Future Solutions Agronomist");
  const [type, setType]       = useState("info");
  const [isSending, setIsSending] = useState(false);

  const handleSendTip = async () => {
    if (!newText.trim()) return;
    setIsSending(true);
    try {
      await addTip({
        farm_id: recipient === "all" ? null : recipient,
        author,
        text: newText,
        type,
      });
      setNewText("");
      if (onRefresh) onRefresh();
    } catch(err) {
      alert("Failed to send tip: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div className="tips-pg">
        <div>
          <div className="section-h">Agronomic Tip Library ({tips.length})</div>
          {tips.length === 0 ? (
            <div style={{textAlign:"center",padding:"48px 0",color:"var(--muted)",fontSize:13}}>
              No agronomic tips posted yet. Broadcast a new recommendation using the form.
            </div>
          ) : (
            tips.map((t,i)=>(
              <div key={t.id || i} className="agro-tip-row">
                <div className="agro-num">#{i+1}</div>
                <div className="agro-text">{t.text}</div>
                <span className={`badge ${t.type}`} style={{marginLeft:"auto",fontSize:9}}>{t.type}</span>
              </div>
            ))
          )}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <div className="card">
            <div className="card-title">Broadcast Recommendation</div>
            <div className="card-sub">Send agronomic guidance to one farm or all farmers</div>

            <div style={{marginBottom:12}}>
              <label className="form-label">Recipient</label>
              <select className="form-select" value={recipient} onChange={e=>setRec(e.target.value)}>
                <option value="all">All Farmers</option>
                {farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label className="form-label">Recommendation Type</label>
              <select className="form-select" value={type} onChange={e=>setType(e.target.value)}>
                <option value="info">Info</option>
                <option value="good">Good News</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent Action</option>
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label className="form-label">Message</label>
              <textarea className="form-textarea" placeholder="Write agronomic advice or recommendation…"
                value={newText} onChange={e=>setNewText(e.target.value)}/>
            </div>
            <button 
              className="send-btn" 
              style={{width:"100%"}} 
              disabled={isSending}
              onClick={handleSendTip}>
              {isSending ? "Publishing..." : "Add to Library & Send →"}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Platform Summary</div>
            <div className="card-sub">Live operations status</div>
            {[
              {label:"Tips in database", val:tips.length, color:"var(--green)"},
              {label:"Active farms", val:farms.filter(f=>f.status==="active").length, color:"var(--blue)"},
              {label:"Farms with alerts", val:farms.filter(f=>f.alerts>0).length, color:"var(--red)"},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"11px 0",borderBottom:"1px solid var(--divider)"}}>
                <span style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>{s.label}</span>
                <span style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15,color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alerts Page ───────────────────────────────────────────────────────────
function AlertsPage({ farms = [] }) {
  const alerts = (farms || []).flatMap(f=>
    (f.nodes || []).filter(n=>{
      const hum=n.sensor_json?.humidity||0;
      const ec=n.sensor_json?.ec||0;
      return hum<40||!n.active||ec>3.0;
    }).map(n=>{
      const hum=n.sensor_json?.humidity||0;
      const ec=n.sensor_json?.ec||0;
      const type=!n.active?"info":hum<25?"danger":ec>3.5?"warning":"warning";
      const msg=!n.active?`${n.node_id} on ${f.name}'s farm is offline`
        :hum<25?`Critical moisture at ${n.node_id} : ${f.name}'s farm (${hum.toFixed(1)}%)`
        :ec>3.5?`High EC at ${n.node_id} : ${f.name}'s farm (${ec.toFixed(2)} mS/cm)`
        :`Low humidity at ${n.node_id} : ${f.name}'s farm (${hum.toFixed(1)}%)`;
      return {key:`${f.id}-${n.node_id}`,type,msg,farm:f,node:n};
    })
  );

  return (
    <div>
      {alerts.length===0
        ? <div className="card" style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:32,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:16,color:"var(--green)"}}>No active alerts</div>
            <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>All connected farms are within normal operating parameters</div>
          </div>
        : alerts.map(a=>(
          <div key={a.key} className={`alert-card ${a.type}`}>
            <div className="alert-icon">
              {a.type==="danger"?"🚨":a.type==="warning"?"⚠️":"📡"}
            </div>
            <div style={{flex:1}}>
              <div className="alert-title">{a.msg}</div>
              <div className="alert-desc">{a.farm.id} · {a.farm.location}</div>
            </div>
            <span className={`badge ${a.type}`}>{a.type}</span>
          </div>
        ))
      }
    </div>
  );
}

// ── Database Reset Controls Page ─────────────────────────────────────────────
function ResetPage({ onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleReset = async (target, label) => {
    if (!window.confirm(`Are you sure you want to execute: ${label}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await resetDatabase(target);
      setFeedback({ success: true, message: res.message || "Reset completed successfully." });
      if (onRefresh) await onRefresh();
    } catch(err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{maxWidth: 760, margin: "0 auto"}}>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-title">Database Management & Reset Provisions</div>
        <div className="card-sub">Administrative utilities to purge sensor logs, re-initialize database tables, or seed demo preview data</div>

        {feedback && (
          <div style={{
            padding: "14px 18px", borderRadius: 8, marginBottom: 20, fontSize: 13,
            background: feedback.success ? "var(--green-pale)" : "var(--red-pale)",
            color: feedback.success ? "var(--green-dark)" : "var(--red)",
            border: `1px solid ${feedback.success ? "var(--green-mid)" : "var(--red-mid)"}`
          }}>
            {feedback.message}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* OPTION 1 */}
          <div style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:18,borderRadius:10,background:"var(--bg)",border:"1px solid var(--border)"
          }}>
            <div>
              <div style={{fontWeight:700,fontFamily:"Nunito,sans-serif",fontSize:14,color:"var(--text)"}}>
                Clear Telemetry & Sensor Readings
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>
                Flushes all historical sensor logs from the <code>readings</code> table and resets node counters. Farms and API keys are preserved.
              </div>
            </div>
            <button 
              disabled={busy}
              onClick={()=>handleReset("readings", "Clear Telemetry")}
              style={{
                background:"var(--yellow)",color:"#544100",border:"none",padding:"10px 18px",
                borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"
              }}>
              Clear Telemetry
            </button>
          </div>

          {/* OPTION 2 */}
          <div style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:18,borderRadius:10,background:"var(--red-pale)",border:"1px solid var(--red-mid)"
          }}>
            <div>
              <div style={{fontWeight:700,fontFamily:"Nunito,sans-serif",fontSize:14,color:"var(--red)"}}>
                Factory Reset Entire Database
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>
                Wipes all tables (readings, nodes, crops, farms, tips) and re-executes clean schema provisioning with the initial default API key.
              </div>
            </div>
            <button 
              disabled={busy}
              onClick={()=>handleReset("full", "Factory Reset Database")}
              style={{
                background:"var(--red)",color:"#fff",border:"none",padding:"10px 18px",
                borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"
              }}>
              Factory Reset
            </button>
          </div>

          {/* OPTION 3 */}
          <div style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:18,borderRadius:10,background:"var(--green-pale)",border:"1px solid var(--green-mid)"
          }}>
            <div>
              <div style={{fontWeight:700,fontFamily:"Nunito,sans-serif",fontSize:14,color:"var(--green-dark)"}}>
                Seed Demo Preview Data
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>
                Populates sample demo farms, nodes, and 24h readings. Useful for testing UI charts before physical hardware is deployed.
              </div>
            </div>
            <button 
              disabled={busy}
              onClick={()=>handleReset("demo", "Seed Demo Data")}
              style={{
                background:"var(--green)",color:"#fff",border:"none",padding:"10px 18px",
                borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"
              }}>
              Seed Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [page, setPage]     = useState("overview");
  const [farms, setFarms]   = useState([]);
  const [tips, setTips]     = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [farmsData, tipsData] = await Promise.all([
        getFarms(),
        getTips()
      ]);
      setFarms(Array.isArray(farmsData) ? farmsData : []);
      setTips(Array.isArray(tipsData) ? tipsData : []);
    } catch(err) {
      console.error("Admin refresh error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const id = setInterval(refreshData, 5000);
    return () => clearInterval(id);
  }, []);

  const totalAlerts = farms.reduce((a,f)=>a+(f.alerts||0), 0);

  const NAV = [
    { section:"OPERATIONS" },
    { id:"overview",   icon:"◈", label:"Overview" },
    { id:"farms",      icon:"⊞", label:"Farms", badge:farms.length, bc:"green" },
    { id:"analytics",  icon:"⊿", label:"Analytics" },
    { section:"HARDWARE & API" },
    { id:"keys",       icon:"🔑", label:"Ingest & API Keys" },
    { section:"AGRONOMICS" },
    { id:"tips",       icon:"✦", label:"Tip Library", badge:tips.length || null, bc:"blue" },
    { section:"SYSTEM" },
    { id:"alerts",     icon:"⚠", label:"Alerts", badge:totalAlerts || null, bc:"red" },
    { id:"reset",      icon:"↺", label:"Database Reset" },
  ];

  const TITLES = {
    overview:"Operations Overview", farms:"Farm Directory",
    analytics:"Fleet Analytics",    keys:"Device Ingestion & API Keys",
    tips:"Agronomic Tips",          alerts:"Active Alerts",
    reset:"Database Management & Reset",
  };

  return (
    <>
      <style>{css}</style>
      <div className="layout">

        <aside className="sidebar">
          <div className="sidebar-brand">
            <Logo/>
            <div className="ops-tag">Ops</div>
          </div>

          <nav className="sidebar-nav">
            {NAV.map((item,i)=>{
              if (item.section) return (
                <div key={i} className="nav-group-label">{item.section}</div>
              );
              return (
                <button key={item.id} className={`nav-item ${page===item.id?"active":""}`}
                  onClick={()=>setPage(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge ${item.bc}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="admin-row">
              <div className="admin-avatar">FSL</div>
              <div>
                <div className="admin-name">Future Solutions</div>
                <div className="admin-role">Supervisor</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="main-content">
          <div className="top-bar">
            <div className="page-title">{TITLES[page]||page}</div>
            <div className="top-right">
              {totalAlerts>0 && (
                <div className="tb-pill" style={{borderColor:"var(--red-mid)",background:"var(--red-pale)",color:"var(--red)"}}>
                  <div className="alert-dot"/>
                  {totalAlerts} alert{totalAlerts>1?"s":""}
                </div>
              )}
              <div className="tb-pill">
                <div className="live-dot"/>
                System live
              </div>
              <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,fontFamily:"Nunito,sans-serif"}}>
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="page-content">
            {page==="overview"  && <OverviewPage farms={farms}/>}
            {page==="farms"     && <FarmsPage farms={farms} onRefresh={refreshData}/>}
            {page==="analytics" && <AnalyticsPage farms={farms}/>}
            {page==="keys"      && <ApiKeysPage farms={farms} onRefresh={refreshData}/>}
            {page==="tips"      && <TipsPage tips={tips} farms={farms} onRefresh={refreshData}/>}
            {page==="alerts"    && <AlertsPage farms={farms}/>}
            {page==="reset"     && <ResetPage onRefresh={refreshData}/>}
          </div>

          <div style={{background:"var(--surface)",borderTop:"1px solid var(--border)",
            padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:"var(--muted)",fontWeight:600}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"var(--green)"}}/>
              © 2026 Future Solutions Ltd : Operations Platform
            </div>
            <div style={{fontSize:11,color:"var(--muted)"}}>
              {farms.filter(f=>f.status==="active").length} active farms · {farms.reduce((a,f)=>a+(f.nodes?f.nodes.filter(n=>n.active).length:0),0)} live sensors
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
