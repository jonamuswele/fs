import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ── Future Solutions Ltd Brand Colors ────────────────────────────────────
// Green:  #1a9c3e  (FUTURE)
// Blue:   #1d9cd3  (SOLUTIONS LTD)
// Yellow: #f5c518  (dot accents)

import { getNodes, getHistory, getCrops, saveCrop, registerNode } from "./api";
import { fetchWeatherForecast } from "./services/weatherService";
import MapLocationPicker from "./components/MapLocationPicker";
import CropDetailsPage from "./components/CropDetailsPage";

// ── Future Solutions Ltd Brand Colors ────────────────────────────────────
// Green:  #1a9c3e  (FUTURE)
// Blue:   #1d9cd3  (SOLUTIONS LTD)
// Yellow: #f5c518  (dot accents)

const PALETTE = ["#1a9c3e", "#1d9cd3", "#f5c518", "#e8471a", "#9b51e0", "#00b4d8", "#2ec4b6", "#e63946"];

// Node colors : drawn from brand palette with dynamic fallback
const NODE_COLORS = {
  NODE_01: "#1a9c3e",   // brand green
  NODE_02: "#1d9cd3",   // brand blue
  NODE_03: "#f5c518",   // brand yellow
  NODE_04: "#e8471a",   // warm red complement
};

const getNodeColor = (nodeId, index = 0) => {
  return NODE_COLORS[nodeId] || PALETTE[index % PALETTE.length];
};

const MOISTURE_THRESHOLD = 40;

// ── CSS ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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
    --bg:         #f7f9f7;
    --surface:    #ffffff;
    --border:     #e2ebe4;
    --text:       #0d2416;
    --muted:      #5a7a65;
    --divider:    #ddeee2;
  }

  body {
    font-family: 'Nunito Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .app-header {
    background: #ffffff;
    border-bottom: 3px solid var(--green);
    padding: 0 32px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 12px rgba(26,156,62,.08);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-logo {
    height: 44px;
    width: auto;
    display: block;
  }

  .brand-divider {
    width: 1px;
    height: 32px;
    background: var(--border);
  }

  .brand-product {
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: .02em;
    text-transform: uppercase;
  }

  .brand-product-sub {
    font-size: 11px;
    color: var(--muted);
    font-weight: 400;
    margin-top: 1px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .live-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--green-pale);
    border: 1px solid var(--green-mid);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--green-dark);
    font-family: 'Nunito', sans-serif;
  }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 2px var(--green-mid);
    animation: livepulse 2s infinite;
  }

  @keyframes livepulse {
    0%,100% { box-shadow: 0 0 0 2px var(--green-mid); }
    50%      { box-shadow: 0 0 0 5px rgba(26,156,62,.15); }
  }

  .update-time {
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }

  /* ── NAV ── */
  .nav-bar {
    background: #fff;
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    display: flex;
    gap: 2px;
  }

  .nav-tab {
    padding: 14px 20px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    color: var(--muted);
    cursor: pointer;
    border: none;
    background: none;
    position: relative;
    transition: color .2s;
    letter-spacing: .01em;
    white-space: nowrap;
  }

  .nav-tab:hover { color: var(--green); }

  .nav-tab.active { color: var(--green); }

  .nav-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--green);
    border-radius: 3px 3px 0 0;
  }

  /* ── MAIN ── */
  .app-main {
    padding: 28px 32px;
    max-width: 1440px;
    margin: 0 auto;
  }

  /* ── CARD ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
  }

  .card-title {
    font-family: 'Nunito', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 2px;
  }

  .card-sub {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 20px;
  }

  /* ── STAT STRIP ── */
  .stat-strip {
    display: grid;
    grid-template-columns: repeat(4,1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-tile-accent {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 12px 0 0 12px;
  }

  .stat-tile-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .08em;
    padding-left: 10px;
  }

  .stat-tile-val {
    font-family: 'Nunito', sans-serif;
    font-size: 32px;
    font-weight: 800;
    line-height: 1.1;
    padding-left: 10px;
  }

  .stat-tile-detail {
    font-size: 12px;
    color: var(--muted);
    padding-left: 10px;
  }

  /* ── SENSOR CARDS ── */
  .sensor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
    gap: 14px;
    margin-bottom: 24px;
  }

  .sensor-node-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 18px;
    transition: transform .2s, box-shadow .2s;
    position: relative;
    overflow: hidden;
  }

  .sensor-node-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(26,156,62,.1);
  }

  .sensor-node-card.online  { border-color: var(--green-mid); }
  .sensor-node-card.offline { opacity: .65; border-color: #e8c8c0; }

  .node-color-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    border-radius: 12px 12px 0 0;
  }

  .node-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    margin-top: 6px;
  }

  .node-name {
    font-family: 'Nunito', sans-serif;
    font-weight: 800;
    font-size: 14px;
    color: var(--text);
  }

  .node-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    font-family: 'Nunito', sans-serif;
  }

  .node-badge.online  { background: var(--green-pale); color: var(--green-dark); }
  .node-badge.offline { background: var(--red-pale);   color: var(--red); }

  .sensor-val-row { display: flex; flex-direction: column; gap: 10px; }

  .sensor-val {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .sensor-key {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .04em;
    white-space: nowrap;
  }

  .sensor-num {
    font-family: 'Nunito', sans-serif;
    font-size: 15px;
    font-weight: 700;
  }

  .sensor-bar-wrap {
    height: 5px;
    border-radius: 3px;
    background: var(--bg);
    overflow: hidden;
    margin-top: 3px;
  }

  .sensor-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width .6s ease;
  }

  /* ── ALERTS ── */
  .alert-strip {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .alert-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: 10px;
    padding: 14px 18px;
    flex: 1;
    min-width: 220px;
    border: 1.5px solid;
  }

  .alert-card.danger  { background: var(--red-pale);    border-color: #f0b4a0; }
  .alert-card.warning { background: var(--yellow-pale); border-color: var(--yellow-mid); }
  .alert-card.ok      { background: var(--green-pale);  border-color: var(--green-mid); }

  .alert-icon { font-size: 22px; line-height: 1; flex-shrink: 0; margin-top: 1px; }

  .alert-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    font-family: 'Nunito', sans-serif;
  }

  .alert-desc {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
    line-height: 1.5;
  }

  /* ── CHART TOGGLE ── */
  .chart-toggle {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .toggle-btn {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1.5px solid var(--border);
    background: #fff;
    font-size: 12px;
    font-family: 'Nunito', sans-serif;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all .2s;
  }

  .toggle-btn:hover  { border-color: var(--green); color: var(--green); }
  .toggle-btn.active { background: var(--green); border-color: var(--green); color: #fff; }

  /* ── NODE TOGGLE ── */
  .node-toggle {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border-radius: 20px;
    border: 1.5px solid;
    cursor: pointer;
    font-size: 12px;
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    transition: all .2s;
    background: #fff;
  }

  .ntdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── WEATHER ── */
  .weather-strip {
    display: grid;
    grid-template-columns: repeat(7,1fr);
    gap: 10px;
    margin-bottom: 24px;
  }

  .weather-day {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 16px 10px;
    text-align: center;
    transition: transform .2s, box-shadow .2s;
  }

  .weather-day:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(29,156,211,.12);
  }

  .weather-day.today {
    border-color: var(--blue-mid);
    background: var(--blue-pale);
  }

  .weather-day-name {
    font-size: 10px;
    font-weight: 800;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 8px;
    font-family: 'Nunito', sans-serif;
  }

  .weather-icon { font-size: 26px; margin-bottom: 8px; }

  .weather-temps {
    font-family: 'Nunito', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }

  .weather-rain      { font-size: 11px; font-weight: 600; color: var(--blue); }
  .weather-rain.none { color: var(--muted); }

  /* ── CROP ── */
  .crop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px,1fr));
    gap: 16px;
  }

  .crop-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
  }

  .crop-card-aesthetic {
    background: #ffffff;
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .crop-card-aesthetic:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(26, 156, 62, 0.12);
    border-color: var(--green);
  }

  .crop-card-aesthetic:hover .view-cta-arrow {
    transform: translateX(4px);
  }

  .view-cta-arrow {
    transition: transform 0.2s ease;
    display: inline-block;
  }

  .crop-top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    border-radius: 12px 12px 0 0;
  }

  .crop-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    margin-top: 8px;
  }

  .crop-node-label {
    font-family: 'Nunito', sans-serif;
    font-weight: 800;
    font-size: 14px;
    color: var(--text);
  }

  .form-field { margin-bottom: 12px; }

  .form-label {
    font-size: 11px;
    color: var(--muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    display: block;
    margin-bottom: 5px;
  }

  .form-input, .form-select {
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    font-family: 'Nunito Sans', sans-serif;
    font-size: 13px;
    color: var(--text);
    outline: none;
    transition: border-color .2s;
  }

  .form-input:focus, .form-select:focus { border-color: var(--green); }

  .days-since {
    font-size: 11px;
    font-weight: 700;
    color: var(--green);
    margin-top: 4px;
    font-family: 'Nunito', sans-serif;
  }

  .save-btn {
    width: 100%;
    padding: 9px;
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    transition: background .2s;
    margin-top: 4px;
    letter-spacing: .02em;
  }

  .save-btn:hover { background: var(--green-dark); }

  /* ── RECOMMENDATIONS ── */
  .rec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px,1fr));
    gap: 16px;
  }

  .rec-card {
    border-radius: 12px;
    padding: 20px;
    border: 1.5px solid;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
  }

  .rec-card.urgent  { border-color: #f0b4a0; background: var(--red-pale); }
  .rec-card.warning { border-color: var(--yellow-mid); background: var(--yellow-pale); }
  .rec-card.good    { border-color: var(--green-mid);  background: var(--green-pale); }
  .rec-card.info    { border-color: var(--blue-mid);   background: var(--blue-pale); }

  .rec-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
  }

  .rec-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }

  .rec-title {
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
    line-height: 1.3;
  }

  .rec-node {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .rec-body {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
    margin-bottom: 14px;
  }

  .rec-action {
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 6px;
    display: inline-block;
    font-family: 'Nunito', sans-serif;
    letter-spacing: .02em;
  }

  .rec-card.urgent  .rec-action { background: rgba(232,71,26,.12);  color: var(--red); }
  .rec-card.warning .rec-action { background: rgba(245,197,24,.2);  color: #9a7a00; }
  .rec-card.good    .rec-action { background: rgba(26,156,62,.12);  color: var(--green-dark); }
  .rec-card.info    .rec-action { background: rgba(29,156,211,.12); color: var(--blue-dark); }

  /* ── SECTION HEADINGS ── */
  .section-heading {
    font-family: 'Nunito', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-heading::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 22px;
    background: var(--green);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .section-desc {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 24px;
    padding-left: 14px;
  }

  /* ── FOOTER BRAND STRIP ── */
  .brand-footer {
    background: #fff;
    border-top: 1px solid var(--border);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 40px;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--muted);
  }

  .footer-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
  }

  .history-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .scroll-hint {
    font-size: 11px;
    color: var(--muted);
    margin-left: auto;
    font-weight: 600;
  }

  @media (max-width: 900px) {
    .stat-strip { grid-template-columns: repeat(2,1fr); }
    .weather-strip { grid-template-columns: repeat(4,1fr); }
    .app-main { padding: 16px; }
    .nav-bar  { padding: 0 16px; overflow-x: auto; }
    .app-header { padding: 0 16px; }
  }
  /* ── TABLE STYLES ── */
  .data-table-container {
    margin-top: 32px;
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  
  .node-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    min-width: 700px;
  }
  
  .node-data-table th {
    text-align: left;
    padding: 16px 16px;
    background: var(--bg);
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 2px solid var(--border);
  }
  
  .node-data-table td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--divider);
    color: var(--text);
  }
  
  .node-data-table tr:hover {
    background: var(--bg);
    transition: background 0.2s;
  }
  
  .node-data-table tr:last-child td {
    border-bottom: none;
  }
  
  .alert-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
  }
  
  .alert-badge.active {
    background: var(--red-pale);
    color: var(--red);
  }
  
  .alert-badge.inactive {
    background: var(--green-pale);
    color: var(--green-dark);
  }
  
  .action-button {
    background: var(--blue);
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-button:hover {
    background: var(--blue-dark);
    transform: translateY(-1px);
  }
  
  .action-button:active {
    transform: translateY(0);
  }
  
  .sensor-value {
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
  }
  
  .sensor-value.high {
    color: var(--red);
  }
  
  .sensor-value.warning {
    color: #9a7a00;
  }
  
  .sensor-value.normal {
    color: var(--green);
  }
  
  .table-header-icon {
    margin-right: 6px;
    font-size: 14px;
  }
  /* ── CROP GROWTH STYLES ── */
  .growth-stage-card {
    background: var(--blue-pale);
    border-radius: 8px;
    padding: 12px;
    margin-top: 12px;
    border-left: 4px solid var(--blue);
  }
  
  .stage-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .stage-icon {
    font-size: 20px;
  }
  
  .stage-name {
    font-weight: 800;
    font-size: 13px;
    color: var(--blue-dark);
  }
  
  .progress-bar-container {
    background: var(--border);
    border-radius: 10px;
    height: 8px;
    margin: 10px 0;
    overflow: hidden;
  }
  
  .progress-bar-fill {
    background: var(--green);
    height: 100%;
    border-radius: 10px;
    transition: width 0.5s ease;
  }
  
  .crop-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 12px 0;
  }
  
  .metric-chip {
    background: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
  }
  
  .observation-list {
    list-style: none;
    padding: 0;
    margin-top: 8px;
  }
  
  .observation-list li {
    font-size: 11px;
    padding: 4px 0;
    color: var(--muted);
  }
  
  .observation-list li:before {
    content: "🔍 ";
    margin-right: 4px;
  }
  
  .recommendation-tag {
    background: rgba(26,156,62,0.1);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    margin: 2px 0;
    display: inline-block;
    margin-right: 4px;
  }
  
  .harvest-countdown {
    background: var(--yellow-pale);
    border-radius: 6px;
    padding: 8px;
    text-align: center;
    margin-top: 12px;
  }
  
  .harvest-countdown.urgent {
    background: var(--red-pale);
    color: var(--red);
  }
  
  .add-node-section {
    margin-top: 32px;
    padding: 24px;
    background: var(--green-pale);
    border-radius: 12px;
    border: 2px dashed var(--green-mid);
  }
`;

// ── Tooltip ───────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0d2416", borderRadius: 10, padding: "10px 14px",
      fontFamily: "Nunito Sans, sans-serif", fontSize: 12, color: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,.25)", border: "1px solid rgba(26,156,62,.3)"
    }}>
      <div style={{ color: "#74c99a", marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3, fontWeight: 600 }}>
          {p.name}: <span style={{ color: "#fff" }}>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
};

// ── LOGO SVG (inline : matches the brand) ────────────────────────────────
// Using text fallback since we cannot embed binary in JSX
const BrandLogo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg width="36" height="36" viewBox="0 0 100 100">
      {/* Simplified dot-globe from logo */}
      <circle cx="55" cy="20" r="7" fill="#1a9c3e"/>
      <circle cx="70" cy="32" r="6" fill="#1a9c3e"/>
      <circle cx="75" cy="50" r="7" fill="#1a9c3e"/>
      <circle cx="68" cy="68" r="6" fill="#1a9c3e"/>
      <circle cx="52" cy="78" r="5" fill="#1a9c3e"/>
      <ellipse cx="45" cy="30" rx="7" ry="11" fill="#1d9cd3"/>
      <ellipse cx="35" cy="52" rx="7" ry="13" fill="#1d9cd3"/>
      <ellipse cx="43" cy="72" rx="6" ry="9"  fill="#1d9cd3"/>
      <circle cx="28" cy="30" r="6"  fill="#f5c518"/>
      <circle cx="22" cy="50" r="5"  fill="#f5c518"/>
      <circle cx="28" cy="70" r="6"  fill="#f5c518"/>
    </svg>
    <div>
      <div style={{ fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:15, color:"#1a9c3e", letterSpacing:".06em", textTransform:"uppercase", lineHeight:1 }}>FUTURE</div>
      <div style={{ fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:11, color:"#1d9cd3", letterSpacing:".08em", textTransform:"uppercase", lineHeight:1, marginTop:1 }}>SOLUTIONS LTD</div>
    </div>
  </div>
);

const getNodeAlertInfo = (node) => {
  const humidity = node.sensor_json?.humidity || 0;
  const temp = node.sensor_json?.temp || 0; 
  const ec = node.sensor_json?.ec || 0;

  let alertActive = false;
  let action ="Monitor";
  let alertType = "normal";

  if (!node.active){
    alertActive = true;
    action = "check device";
    alertType = "offline";
  }else if (humidity < 25){
    alertActive = true;
    action = "Irrigate immediately";
    alertType = "critical";
  }else if (humidity < MOISTURE_THRESHOLD){
    alertActive = true;
    action = "Schedule irrigation";
    alertType = "warning";
  }else if (humidity > 80){
    alertActive = true;
    action = "Improve drainage";
    alertType = "caution";
  } else if (ec > 3.0) {
    alertActive = true;
    action = "Flush soil";
    alertType = "warning";
  } else if (ec < 0.8) {
    alertActive = true;
    action = "Apply fertilizer";
    alertType = "info";
  } else if (temp > 35) {
    alertActive = true;
    action = "Apply mulch";
    alertType = "caution";
  }
  return {alertActive, action, alertType};
}

// ── TAB 1: Dashboard ──────────────────────────────────────────────────────
function DashboardTab({ nodes, history }) {
  const [metric, setMetric] = useState("humidity");

  const active      = nodes.filter(n => n.active);
  const avgHumidity = active.length ? (active.reduce((a,n)=>a+(n.sensor_json?.humidity||0),0)/active.length).toFixed(1) : "0.0";
  const avgTemp     = active.length ? (active.reduce((a,n)=>a+(n.sensor_json?.temp_c||0),0)/active.length).toFixed(1)    : "0.0";
  const needsWater  = active.filter(n => (n.sensor_json?.humidity||0) < MOISTURE_THRESHOLD);

  const metricCfg = {
    humidity: { label:"Soil Humidity", unit:"%",      domain:[0,100],  refLine: MOISTURE_THRESHOLD },
    temp_c:   { label:"Temperature",   unit:"°C",     domain:[10,45],  refLine: null },
    ec:       { label:"EC",            unit:" mS/cm", domain:[0,5],    refLine: null },
  };

  const chartData = (history || []).map(h => {
    const row = { label: h.label };
    nodes.forEach(n => {
      const hum = h[`${n.node_id}_hum`];
      const tmp = h[`${n.node_id}_temp`];
      const ecVal = h[`${n.node_id}_ec`];
      if (metric==="humidity") row[n.node_id] = hum != null ? Number(Number(hum).toFixed(1)) : null;
      if (metric==="temp_c")   row[n.node_id] = tmp != null ? Number(Number(tmp).toFixed(1)) : null;
      if (metric==="ec")       row[n.node_id] = ecVal != null ? Number(Number(ecVal).toFixed(2)) : null;
    });
    return row;
  });

  const tickFmt = (_,i) => i%6===0 ? _ : "";

  const NodeDataTable = ({nodes}) => {
    const [actionMessage, setActionMessage] = useState(null);
    
    const handleActionClick = (nodeId, action) => {
      setActionMessage(`✅ Action logged for ${nodeId}: ${action}`);
      setTimeout(() => setActionMessage(null), 3000);
    };
    return (
      <div className="data-table-container">
        {actionMessage && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--green-dark)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease'
          }}>
            {actionMessage}
          </div>
        )}
        
        <table className="node-data-table">
          <thead>
            <tr>
              <th><span className="table-header-icon">🔌</span> Node ID</th>
              <th><span className="table-header-icon">💧</span> Humidity (%)</th>
              <th><span className="table-header-icon">🌡️</span> Temperature (°C)</th>
              <th><span className="table-header-icon">⚡</span> EC (mS/cm)</th>
              <th><span className="table-header-icon">⚠️</span> Alert Status</th>
              <th><span className="table-header-icon">🎯</span> Action to Take</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(node => {
              const humidity = node.sensor_json?.humidity || 0;
              const temp = node.sensor_json?.temp_c || 0;
              const ec = node.sensor_json?.ec || 0;
              const { alertActive, action, alertType } = getNodeAlertInfo(node);
              
              // Determine CSS class for humidity value coloring
              const getHumidityClass = () => {
                if (humidity < 25) return "high";
                if (humidity < MOISTURE_THRESHOLD) return "warning";
                return "normal";
              };
              
              // Determine CSS class for temperature
              const getTempClass = () => {
                if (temp > 35) return "high";
                if (temp < 10) return "warning";
                return "normal";
              };
              
              // Determine CSS class for EC
              const getECClass = () => {
                if (ec > 3.0) return "high";
                if (ec < 0.8) return "warning";
                return "normal";
              };
              
              return (
                <tr key={node.node_id}>
                  <td style={{ fontWeight: '700' }}>
                    {node.node_id}
                    {!node.active && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--red)' }}>●</span>}
                  </td>
                  <td>
                    <span className={`sensor-value ${getHumidityClass()}`}>
                      {humidity.toFixed(1)}%
                    </span>
                    {humidity < MOISTURE_THRESHOLD && (
                      <span style={{ marginLeft: '8px', fontSize: '10px' }}>⚠️</span>
                    )}
                  </td>
                  <td>
                    <span className={`sensor-value ${getTempClass()}`}>
                      {temp.toFixed(1)}°C
                    </span>
                  </td>
                  <td>
                    <span className={`sensor-value ${getECClass()}`}>
                      {ec.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div className={`alert-badge ${alertActive ? 'active' : 'inactive'}`}>
                      {alertActive ? '🔴 ACTIVE' : '🟢 NORMAL'}
                    </div>
                    {alertActive && (
                      <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--muted)' }}>
                        {alertType === 'critical' && 'Urgent action needed'}
                        {alertType === 'warning' && 'Attention required'}
                        {alertType === 'offline' && 'Device offline'}
                      </div>
                    )}
                  </td>
                  <td>
                    <button 
                      className="action-button"
                      onClick={() => handleActionClick(node.node_id, action)}
                    >
                      {action}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {/* STATS */}
      <div className="stat-strip">
        {[
          { label:"Active Nodes",  val:`${active.length}/${nodes.length}`, detail:"Sensors online",        color:"var(--green)",  tc:"var(--green)" },
          { label:"Avg Humidity",  val:`${avgHumidity}%`,                  detail:"Across all active nodes", color:"var(--blue)",   tc:"var(--blue)" },
          { label:"Avg Temp",      val:`${avgTemp}°C`,                     detail:"Field average",          color:"var(--yellow)", tc:"#9a7a00" },
          { label:"Need Water",    val:`${needsWater.length}`,             detail:`Below ${MOISTURE_THRESHOLD}% threshold`, color:needsWater.length?"var(--red)":"var(--green)", tc:needsWater.length?"var(--red)":"var(--green)" },
        ].map(s => (
          <div key={s.label} className="stat-tile">
            <div className="stat-tile-accent" style={{ background: s.color }}/>
            <div className="stat-tile-label">{s.label}</div>
            <div className="stat-tile-val" style={{ color: s.tc }}>{s.val}</div>
            <div className="stat-tile-detail">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* ALERTS */}
      {needsWater.length > 0 && (
        <div className="alert-strip">
          {needsWater.map(n => (
            <div key={n.node_id} className="alert-card warning">
              <div className="alert-icon">💧</div>
              <div>
                <div className="alert-title">{n.node_id} needs irrigation</div>
                <div className="alert-desc">Humidity at {n.sensor_json?.humidity?.toFixed(1)}% : below {MOISTURE_THRESHOLD}% threshold</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SENSOR CARDS OR EMPTY STATE */}
      {nodes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", marginBottom: "24px" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
          <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 17, color: "var(--text)" }}>
            No Field Sensor Nodes Connected Yet
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 540, margin: "8px auto 18px", lineHeight: 1.5 }}>
            Telemetry will stream live to this dashboard as soon as your IoT nodes transmit readings using your secure API key.
          </div>
          <a href="/admin" style={{ display: "inline-block", background: "var(--green)", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            Open Admin Ops to View API Key & Test Ingest →
          </a>
        </div>
      ) : (
        <div className="sensor-grid">
          {nodes.map((n, idx) => {
            const hum = n.sensor_json?.humidity||0;
            const col = getNodeColor(n.node_id, idx);
            const humColor = hum<30 ? "var(--red)" : hum<MOISTURE_THRESHOLD ? "var(--yellow)" : "var(--green)";
            return (
              <div key={n.node_id} className={`sensor-node-card ${n.active?"online":"offline"}`}>
                <div className="node-color-bar" style={{ background: col }}/>
                <div className="node-name-row">
                  <span className="node-name">{n.node_id}</span>
                  <span className={`node-badge ${n.active?"online":"offline"}`}>{n.active?"LIVE":"OFFLINE"}</span>
                </div>
                <div className="sensor-val-row">
                  <div>
                    <div className="sensor-val">
                      <span className="sensor-key">Humidity</span>
                      <span className="sensor-num" style={{ color:humColor }}>{hum.toFixed(1)}%</span>
                    </div>
                    <div className="sensor-bar-wrap">
                      <div className="sensor-bar-fill" style={{ width:`${Math.min(100, hum)}%`, background:humColor }}/>
                    </div>
                  </div>
                  <div className="sensor-val">
                    <span className="sensor-key">Temp</span>
                    <span className="sensor-num" style={{ color:"var(--blue)" }}>{(n.sensor_json?.temp_c||0).toFixed(1)}°C</span>
                  </div>
                  <div className="sensor-val">
                    <span className="sensor-key">EC</span>
                    <span className="sensor-num" style={{ color:"var(--text)" }}>{(n.sensor_json?.ec||0).toFixed(2)} mS/cm</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHART */}
      <div className="card">
        <div className="card-title">Live Sensor Readings : Last 24h</div>
        <div className="card-sub">30-minute intervals across all nodes</div>
        <div className="chart-toggle">
          {Object.entries(metricCfg).map(([k,v]) => (
            <button key={k} className={`toggle-btn ${metric===k?"active":""}`} onClick={()=>setMetric(k)}>{v.label}</button>
          ))}
        </div>
        {chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
            Waiting for live sensor data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{top:5,right:10,left:-10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
              <XAxis dataKey="label" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}} tickFormatter={tickFmt}/>
              <YAxis domain={metricCfg[metric].domain} tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}} unit={metricCfg[metric].unit}/>
              <Tooltip content={<CustomTooltip unit={metricCfg[metric].unit}/>}/>
              <Legend wrapperStyle={{fontSize:12,fontFamily:"Nunito Sans",fontWeight:600}}/>
              {metricCfg[metric].refLine && (
                <ReferenceLine y={metricCfg[metric].refLine} stroke="var(--yellow)" strokeDasharray="5 4"
                  label={{value:"Min",fill:"var(--yellow)",fontSize:10,fontWeight:700}}/>
              )}
              {nodes.map((n, idx) => (
                <Line key={n.node_id} type="monotone" dataKey={n.node_id}
                  stroke={getNodeColor(n.node_id, idx)} strokeWidth={2.5} dot={false} activeDot={{r:5}}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* NODE DATA TABLE */}
      <div style={{ marginTop: '32px' }}>
        <div className="section-heading">Node Status Overview</div>
        <div className="section-desc">
          Comprehensive view of all sensor nodes with real-time alerts and recommended actions
        </div>
        <NodeDataTable nodes={nodes} />
      </div>
    </div>
  );
}

// ── TAB 2: History ────────────────────────────────────────────────────────
function HistoryTab({ nodes, history }) {
  const [sel, setSel]       = useState(nodes.map(n=>n.node_id));
  const [metric, setMetric] = useState("humidity");

  useEffect(() => {
    if (nodes.length > 0 && sel.length === 0) {
      setSel(nodes.map(n => n.node_id));
    }
  }, [nodes]);

  const toggle = id => setSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const metricUnit  = { humidity:"%", temp_c:"°C", ec:" mS/cm" };
  const metricLabel = { humidity:"Soil Humidity", temp_c:"Temperature", ec:"Electrical Conductivity" };

  const chartData = (history || []).map(h => {
    const row = { label: h.label };
    sel.forEach(id => {
      const hum = h[`${id}_hum`];
      const tmp = h[`${id}_temp`];
      const ecVal = h[`${id}_ec`];
      if (metric==="humidity") row[id] = hum != null ? Number(Number(hum).toFixed(1)) : null;
      if (metric==="temp_c")   row[id] = tmp != null ? Number(Number(tmp).toFixed(1)) : null;
      if (metric==="ec")       row[id] = ecVal != null ? Number(Number(ecVal).toFixed(2)) : null;
    });
    return row;
  });

  const dailyHistory = (history || []).slice(-14).map(h => {
    const humKeys = Object.keys(h).filter(k => k.endsWith("_hum"));
    const avgH = humKeys.length ? humKeys.reduce((s, k) => s + (h[k] || 0), 0) / humKeys.length : 0;
    return {
      label: h.label,
      avg_hum: Number(avgH.toFixed(1)),
      rainfall_mm: 0,
      irrigation_l: 0,
    };
  });

  const tickFmt = (_,i) => i%6===0 ? _ : "";

  return (
    <div>
      <div className="section-heading">Historical Data</div>
      <div className="section-desc">Compare sensor readings over time : select nodes and metric</div>

      {nodes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 16 }}>No Sensor History Available</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
            Telemetry history will be charted here once sensor readings arrive from your nodes.
          </div>
        </div>
      ) : (
        <div className="card" style={{marginBottom:24}}>
          <div className="card-title">{metricLabel[metric]} : 24h History</div>
          <div className="card-sub">Toggle nodes to compare</div>

          <div className="history-controls">
            <div className="chart-toggle" style={{marginBottom:0}}>
              {Object.entries(metricLabel).map(([k,v]) => (
                <button key={k} className={`toggle-btn ${metric===k?"active":""}`} onClick={()=>setMetric(k)}>{v}</button>
              ))}
            </div>
            <span className="scroll-hint">Select nodes below ↓</span>
          </div>

          <div className="history-controls">
            {nodes.map((n, idx) => {
              const on  = sel.includes(n.node_id);
              const col = getNodeColor(n.node_id, idx);
              return (
                <button key={n.node_id} className="node-toggle" onClick={()=>toggle(n.node_id)}
                  style={{ borderColor:on?col:"var(--border)", color:on?col:"var(--muted)", opacity:on?1:.5 }}>
                  <div className="ntdot" style={{background:on?col:"var(--muted)"}}/>
                  {n.node_id}
                </button>
              );
            })}
          </div>

          {chartData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
              No telemetry data in this time range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={chartData} margin={{top:5,right:10,left:-10,bottom:5}}>
                <defs>
                  {sel.map((id, idx) => (
                    <linearGradient key={id} id={`g_${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={getNodeColor(id, idx)} stopOpacity={0.18}/>
                      <stop offset="95%" stopColor={getNodeColor(id, idx)} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
                <XAxis dataKey="label" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}} tickFormatter={tickFmt}/>
                <YAxis tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}} unit={metricUnit[metric]}/>
                <Tooltip content={<CustomTooltip unit={metricUnit[metric]}/>}/>
                <Legend wrapperStyle={{fontSize:12,fontFamily:"Nunito Sans",fontWeight:600}}/>
                {metric==="humidity" && (
                  <ReferenceLine y={MOISTURE_THRESHOLD} stroke="var(--yellow)" strokeDasharray="5 4"
                    label={{value:"Threshold",fill:"#9a7a00",fontSize:10,fontWeight:700}}/>
                )}
                {sel.map((id, idx) => (
                  <Area key={id} type="monotone" dataKey={id}
                    stroke={getNodeColor(id, idx)} strokeWidth={2.5}
                    fill={`url(#g_${id})`} dot={false} activeDot={{r:5}}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-title">Daily Water Summary : Recent Activity</div>
        <div className="card-sub">Average soil humidity, rainfall, and irrigation applied per day</div>
        {dailyHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "var(--muted)", fontSize: 13 }}>
            No daily summary data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyHistory} margin={{top:5,right:10,left:-10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)"/>
              <XAxis dataKey="label" tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
              <YAxis tick={{fontSize:10,fontFamily:"Nunito Sans",fill:"var(--muted)"}}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:12,fontFamily:"Nunito Sans",fontWeight:600}}/>
              <Bar dataKey="avg_hum"      name="Avg Humidity (%)"       fill="#1a9c3e" radius={[4,4,0,0]}/>
              <Bar dataKey="rainfall_mm"  name="Rainfall (mm)"          fill="#1d9cd3" radius={[4,4,0,0]}/>
              <Bar dataKey="irrigation_l" name="Irrigation Applied (L)" fill="#f5c518" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const CROP_GROWTH_DATA = {
  "Maize": {
    maturityDays: 90,
    growthStages: [
      { name: "Germination", daysRange: [0, 10], description: "Seed sprouting", icon: "🌱", actions: ["Keep soil moist", "Avoid waterlogging"] },
      { name: "Seedling", daysRange: [11, 25], description: "Early leaf development", icon: "🌿", actions: ["Apply starter fertilizer", "Control weeds"] },
      { name: "Vegetative", daysRange: [26, 55], description: "Rapid growth, stalk development", icon: "🌾", actions: ["Side-dress nitrogen", "Monitor pests"] },
      { name: "Tasseling/Silking", daysRange: [56, 70], description: "Reproductive stage", icon: "🌽", actions: ["Ensure adequate water", "Watch for corn borers"] },
      { name: "Grain Fill", daysRange: [71, 85], description: "Kernel development", icon: "🍿", actions: ["Protect from birds", "Monitor moisture"] },
      { name: "Maturity", daysRange: [86, 90], description: "Ready for harvest", icon: "🚜", actions: ["Check kernel moisture", "Prepare harvest equipment"] }
    ]
  },
  "Wheat": {
    maturityDays: 120,
    growthStages: [
      { name: "Germination", daysRange: [0, 10], icon: "🌱", description: "Seed sprouting", actions: ["Even moisture", "Check emergence"] },
      { name: "Tillering", daysRange: [11, 40], icon: "🌿", description: "Shoot formation", actions: ["Apply nitrogen", "Control weeds"] },
      { name: "Stem Extension", daysRange: [41, 65], icon: "📏", description: "Stem elongation", actions: ["Monitor for rust", "Irrigate if dry"] },
      { name: "Heading", daysRange: [66, 85], icon: "🌾", description: "Head emergence", actions: ["Protect from frost", "Fungicide if needed"] },
      { name: "Flowering", daysRange: [86, 100], icon: "🌸", description: "Pollination", actions: ["Avoid water stress", "Monitor for aphids"] },
      { name: "Ripening", daysRange: [101, 120], icon: "🌾", description: "Grain drying", actions: ["Reduce water", "Prepare for harvest"] }
    ]
  },
  "Rice": {
    maturityDays: 140,
    growthStages: [
      { name: "Nursery", daysRange: [0, 21], icon: "🌱", description: "Seedling preparation", actions: ["Maintain water depth", "Fertilize lightly"] },
      { name: "Transplanting", daysRange: [22, 30], icon: "👩‍🌾", description: "Moving to field", actions: ["Puddle soil", "Spacing 20x20cm"] },
      { name: "Tillering", daysRange: [31, 60], icon: "🌿", description: "Culm development", actions: ["Maintain 5cm water", "Apply nitrogen"] },
      { name: "Panicle Initiation", daysRange: [61, 85], icon: "🍚", description: "Grain formation start", actions: ["Deep water to 10cm", "Monitor stem borers"] },
      { name: "Flowering", daysRange: [86, 105], icon: "🌸", description: "Pollination", actions: ["Shallow water 2-5cm", "Avoid stress"] },
      { name: "Grain Filling", daysRange: [106, 130], icon: "🌾", description: "Rice development", actions: ["Alternate wet/dry", "Control birds"] },
      { name: "Maturity", daysRange: [131, 140], icon: "🚜", description: "Ready for harvest", actions: ["Drain field", "Harvest at 20-25% moisture"] }
    ]
  },
  "Tomato": {
    maturityDays: 75,
    growthStages: [
      { name: "Germination", daysRange: [0, 8], icon: "🌱", description: "Seed sprouting", actions: ["Warm soil 25°C", "High humidity"] },
      { name: "Seedling", daysRange: [9, 25], icon: "🌿", description: "True leaves develop", actions: ["Transplant after 6 leaves", "Support stems"] },
      { name: "Vegetative", daysRange: [26, 40], icon: "🍃", description: "Vine growth", actions: ["Stake plants", "Prune suckers"] },
      { name: "Flowering", daysRange: [41, 55], icon: "🌼", description: "Yellow flowers appear", actions: ["Pollination help", "Calcium spray"] },
      { name: "Fruit Set", daysRange: [56, 65], icon: "🍅", description: "Green fruit development", actions: ["Consistent watering", "Watch for blossom end rot"] },
      { name: "Ripening", daysRange: [66, 75], icon: "🍅", description: "Fruit color change", actions: ["Reduce water", "Harvest when red"] }
    ]
  },
  "Cassava": {
    maturityDays: 300,
    growthStages: [
      { name: "Establishment", daysRange: [0, 60], icon: "🌱", description: "Root and stem development", actions: ["Control weeds", "Fertilize with K"] },
      { name: "Canopy Development", daysRange: [61, 120], icon: "🌿", description: "Leaf area expansion", actions: ["Mulch to retain moisture", "Monitor mites"] },
      { name: "Tuber Initiation", daysRange: [121, 180], icon: "🥔", description: "Storage roots start", actions: ["Phosphorus application", "Hill up soil"] },
      { name: "Tuber Bulking", daysRange: [181, 240], icon: "📈", description: "Root enlargement", actions: ["Avoid water stress", "Potassium crucial"] },
      { name: "Maturation", daysRange: [241, 300], icon: "🌾", description: "Starch accumulation", actions: ["Stop fertilizer", "Harvest when leaves yellow"] }
    ]
  }
};

// Default growth stages for other crops
const DEFAULT_GROWTH_STAGES = [
  { name: "Establishment", daysRange: [0, 30], icon: "🌱", description: "Early growth", actions: ["Regular watering", "Monitor emergence"] },
  { name: "Vegetative", daysRange: [31, 60], icon: "🌿", description: "Leaf/Stem growth", actions: ["Fertilize", "Control pests"] },
  { name: "Reproductive", daysRange: [61, 90], icon: "🌸", description: "Flowering/Fruiting", actions: ["Pollination support", "Monitor diseases"] },
  { name: "Maturation", daysRange: [91, 120], icon: "🌾", description: "Harvest ready", actions: ["Reduce water", "Prepare harvest"] }
];

const CROP_EMOJIS = {
  Maize: "🌽",
  Wheat: "🌾",
  Rice: "🍚",
  Tomato: "🍅",
  Cassava: "🌿",
  Yam: "🥔",
  Pepper: "🌶️",
  Groundnut: "🥜",
  Sorghum: "🌾",
  Soybean: "🌱",
  Okra: "🥗",
  Spinach: "🥬",
  Cabbage: "🥬",
  Onion: "🧅",
  Garlic: "🧄",
  Other: "🌱",
};

const analyzeCropGrowth = (cropName, plantingDate, nodeHumidity, nodeTemp) => {
  if (!cropName || !plantingDate) return null;
  
  const planting = new Date(plantingDate);
  const today = new Date();
  const daysSincePlanting = Math.floor((today - planting) / (1000 * 60 * 60 * 24));
  
  // Get crop-specific growth data or use default
  const growthData = CROP_GROWTH_DATA[cropName] || {
    maturityDays: 120,
    growthStages: DEFAULT_GROWTH_STAGES
  };
  
  // Determine current growth stage
  let currentStage = null;
  let nextStage = null;
  
  for (let i = 0; i < growthData.growthStages.length; i++) {
    const stage = growthData.growthStages[i];
    const [start, end] = stage.daysRange;
    
    if (daysSincePlanting >= start && daysSincePlanting <= end) {
      currentStage = stage;
      // Get next stage if exists
      if (i + 1 < growthData.growthStages.length) {
        nextStage = growthData.growthStages[i + 1];
      }
      break;
    }
  }
  
  // If no stage found (beyond maturity)
  if (!currentStage && daysSincePlanting > growthData.maturityDays) {
    currentStage = {
      name: "Overdue Harvest",
      icon: "⚠️",
      description: "Past expected harvest date",
      actions: ["Harvest immediately", "Check quality"]
    };
  }
  
  // Calculate progress percentage
  const progressPercent = Math.min(100, Math.floor((daysSincePlanting / growthData.maturityDays) * 100));
  
  // Expected harvest date
  const harvestDate = new Date(planting);
  harvestDate.setDate(harvestDate.getDate() + growthData.maturityDays);
  
  // Days until harvest
  const daysUntilHarvest = Math.max(0, Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24)));
  
  // Environmental recommendations based on sensor data
  const envRecommendations = [];
  if (nodeHumidity < 40) envRecommendations.push("Low soil moisture - increase irrigation");
  if (nodeHumidity > 80) envRecommendations.push("High soil moisture - improve drainage");
  if (nodeTemp > 32) envRecommendations.push("High temperature - consider shade or mulch");
  if (nodeTemp < 15) envRecommendations.push("Low temperature - protect from cold");
  
  // Stage-specific goals (what you should be seeing)
  const expectedObservations = [];
  if (currentStage) {
    if (currentStage.name === "Flowering" || currentStage.name.includes("Flower")) {
      expectedObservations.push("Should see yellow/white flowers developing");
    }
    if (currentStage.name === "Fruit Set" || currentStage.name.includes("Fruit")) {
      expectedObservations.push("Small fruits should be visible on plants");
    }
    if (currentStage.name === "Vegetative" || currentStage.name === "Tillering") {
      expectedObservations.push("Rapid leaf and stem growth expected");
    }
    if (currentStage.name === "Grain Fill" || currentStage.name === "Tuber Bulking") {
      expectedObservations.push("Grains/tubers should be swelling");
    }
  }
  
  return {
    daysSincePlanting,
    daysUntilHarvest,
    progressPercent,
    currentStage,
    nextStage,
    harvestDate,
    maturityDays: growthData.maturityDays,
    isOverdue: daysSincePlanting > growthData.maturityDays,
    envRecommendations,
    expectedObservations,
    health: progressPercent < 25 ? "🌱 Just planted" :
            progressPercent < 50 ? "🌿 Growing well" :
            progressPercent < 75 ? "🌾 Developing" :
            progressPercent < 100 ? "🍂 Maturing" : "⚠️ Ready for harvest"
  };
};

// ── TAB 3: Crops ──────────────────────────────────────────────────────────
function CropsTab({ nodes, customCrops, setCustomCrops }) {
  const [selectedCropNodeId, setSelectedCropNodeId] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showMapPickerForNew, setShowMapPickerForNew] = useState(false);
  const [newNode, setNewNode] = useState({ 
    id: "", 
    mac: "", 
    crop: "Maize", 
    planted: new Date().toISOString().split('T')[0], 
    notes: "",
    location: {
      lat: -2.2472,
      lng: 28.8042,
      name: "Lwiro Agro Station, DR Congo"
    }
  });

  const cropOptions = ["Maize", "Wheat", "Rice", "Tomato", "Cassava", "Yam", "Pepper",
    "Groundnut", "Sorghum", "Soybean", "Okra", "Spinach", "Cabbage", "Onion", "Garlic", "Other"];

  const daysSince = (plantingDate) => {
    if (!plantingDate) return null;
    const days = (Date.now() - new Date(plantingDate)) / 86400000;
    return Math.floor(days);
  };

  // Add new node
  const addNewNode = async () => {
    if (!newNode.id || !newNode.crop) {
      alert("Please provide at least a Node ID and Crop Type.");
      return;
    }

    const cropPayload = {
      crop: newNode.crop,
      planted: newNode.planted || new Date().toISOString().split('T')[0],
      notes: newNode.notes || "Newly registered node",
      location: newNode.location || {
        lat: -2.2472,
        lng: 28.8042,
        name: "Lwiro Agro Station, DR Congo"
      }
    };
    
    // 1. Add to custom crops in state
    setCustomCrops(prev => ({
      ...prev,
      [newNode.id]: cropPayload
    }));

    // 2. Persist directly to database (node + crop location)
    try {
      await registerNode({
        node_id: newNode.id,
        mac: newNode.mac || null,
        farm_id: "FSL-001",
        label: `${newNode.crop} Sensor`
      });

      await saveCrop({
        node_id: newNode.id,
        farm_id: "FSL-001",
        crop: cropPayload.crop,
        planted: cropPayload.planted,
        notes: cropPayload.notes,
        lat: cropPayload.location.lat,
        lng: cropPayload.location.lng,
        location_name: cropPayload.location.name,
        area_ha: 0.5
      });
    } catch (err) {
      console.warn("Database save warning:", err);
    }
    
    setShowAddNode(false);
    setNewNode({ 
      id: "", 
      mac: "", 
      crop: "Maize", 
      planted: new Date().toISOString().split('T')[0], 
      notes: "",
      location: {
        lat: -2.2472,
        lng: 28.8042,
        name: "Lwiro Agro Station, DR Congo"
      }
    });
  };

  // If a specific crop card is clicked: Open full dedicated CropDetailsPage ("where we see everything")
  if (selectedCropNodeId && customCrops[selectedCropNodeId]) {
    const activeNode = (nodes || []).find(n => n.node_id === selectedCropNodeId) || {
      node_id: selectedCropNodeId,
      active: true,
      sensor_json: { temp_c: 24.5, humidity: 62.0, ec: 1.8 }
    };
    const cData = customCrops[selectedCropNodeId];
    const gAnalysis = analyzeCropGrowth(
      cData.crop,
      cData.planted,
      activeNode.sensor_json?.humidity || 55,
      activeNode.sensor_json?.temp_c || 24
    );

    return (
      <CropDetailsPage
        node={activeNode}
        cropData={cData}
        growthAnalysis={gAnalysis}
        nodeColor={getNodeColor(selectedCropNodeId)}
        onBack={() => setSelectedCropNodeId(null)}
        onUpdateCrop={async (updatedCrop) => {
          setCustomCrops(prev => ({
            ...prev,
            [selectedCropNodeId]: updatedCrop
          }));

          // Persist updated crop details & location to the database
          try {
            await saveCrop({
              node_id: selectedCropNodeId,
              farm_id: "FSL-001",
              crop: updatedCrop.crop,
              planted: updatedCrop.planted,
              notes: updatedCrop.notes,
              lat: updatedCrop.location?.lat,
              lng: updatedCrop.location?.lng,
              location_name: updatedCrop.location?.name,
            });
          } catch (err) {
            console.warn("Database crop update warning:", err);
          }
        }}
      />
    );
  }

  // Only display crops that exist in database (customCrops)
  const displayedNodeIds = Object.keys(customCrops || {});

  const activeCropsList = displayedNodeIds
    .map(id => {
      const node = (nodes || []).find(n => n.node_id === id) || { node_id: id, active: true };
      const cropData = customCrops[id];
      return { node, cropData };
    })
    .filter(item => item.cropData);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="section-heading">Crop Growth & Location Monitor</div>
          <div className="section-desc">
            Sleek crop cards with hyper-local weather tracking and growth analysis. Click any card to inspect all details.
          </div>
        </div>

        <button 
          onClick={() => setShowAddNode(!showAddNode)}
          style={{
            background: "linear-gradient(135deg, #1a9c3e 0%, #157a30 100%)",
            color: "white",
            border: "none",
            padding: "9px 20px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(26,156,62,.25)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span>{showAddNode ? "−" : "+"}</span>
          <span>{showAddNode ? "Cancel" : "Add Crop Node"}</span>
        </button>
      </div>

      {/* Add New Node Form */}
      {showAddNode && (
        <div style={{ 
          background: "white", 
          padding: "24px", 
          borderRadius: "14px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          marginBottom: "28px"
        }}>
          <div style={{ fontWeight: "800", fontSize: "16px", color: "var(--green-dark)", marginBottom: "4px" }}>
            ➕ Register New Field Node & Assign Crop
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "18px" }}>
            Provide node hardware identifiers, crop profile, and set GPS coordinates for live weather.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label className="form-label">Node ID *</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g., NODE_05"
                value={newNode.id}
                onChange={e => setNewNode({...newNode, id: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">MAC Address</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="xx:xx:xx:xx:xx:xx"
                value={newNode.mac}
                onChange={e => setNewNode({...newNode, mac: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">Initial Crop *</label>
              <select 
                className="form-select"
                value={newNode.crop}
                onChange={e => setNewNode({...newNode, crop: e.target.value})}
              >
                {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Planting Date</label>
              <input 
                type="date" 
                className="form-input"
                value={newNode.planted}
                onChange={e => setNewNode({...newNode, planted: e.target.value})}
              />
            </div>
          </div>

          {/* Location Picker Section for New Node */}
          <div style={{
            background: "var(--bg)",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "var(--text)" }}>
                  📍 Field Location: <span style={{ color: "var(--green-dark)" }}>{newNode.location.name}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  Lat: {newNode.location.lat.toFixed(4)} • Lng: {newNode.location.lng.toFixed(4)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setNewNode(prev => ({
                            ...prev,
                            location: {
                              lat: Number(pos.coords.latitude.toFixed(5)),
                              lng: Number(pos.coords.longitude.toFixed(5)),
                              name: `Device GPS (${pos.coords.latitude.toFixed(3)}°, ${pos.coords.longitude.toFixed(3)}°)`
                            }
                          }));
                        },
                        (err) => alert("GPS Error: " + err.message)
                      );
                    }
                  }}
                  style={{
                    background: "var(--blue-pale)",
                    color: "var(--blue-dark)",
                    border: "1px solid var(--blue-mid)",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  📍 Use Live GPS
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPickerForNew(true)}
                  style={{
                    background: "var(--green-pale)",
                    color: "var(--green-dark)",
                    border: "1px solid var(--green-mid)",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  🗺️ Pick on Map
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label className="form-label">Field Notes / Variety</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="e.g., Yellow hybrid corn, drip irrigation zone A"
              value={newNode.notes}
              onChange={e => setNewNode({...newNode, notes: e.target.value})}
            />
          </div>

          <button 
            onClick={addNewNode}
            style={{
              width: "100%",
              background: "var(--green)",
              color: "white",
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "800",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(26,156,62,.2)"
            }}
          >
            Register Node & Add to Field
          </button>
        </div>
      )}

      {/* Abstracted Aesthetic Crop Cards Grid or Empty State */}
      {activeCropsList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginBottom: "24px" }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🌱</div>
          <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 17, color: "var(--text)" }}>
            No crops registered in database yet
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 480, margin: "8px auto 20px", lineHeight: 1.5 }}>
            Only verified crops and locations saved in your database will appear here. Click "Add Crop Node" above to register your first sensor node, crop type, and map location.
          </div>
          <button
            type="button"
            onClick={() => setShowAddNode(true)}
            style={{
              background: "linear-gradient(135deg, #1a9c3e 0%, #157a30 100%)",
              color: "white",
              border: "none",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(26,156,62,.25)",
            }}
          >
            + Register First Crop Node
          </button>
        </div>
      ) : (
        <div className="crop-grid">
          {activeCropsList.map(({ node, cropData }) => {
            const col = NODE_COLORS[node.node_id] || "#1a9c3e";
            const ageDays = daysSince(cropData.planted);
            const emoji = CROP_EMOJIS[cropData.crop] || "🌱";
            const analysis = analyzeCropGrowth(
              cropData.crop,
              cropData.planted,
              node.sensor_json?.humidity || 50,
              node.sensor_json?.temp_c || 25
            );

            return (
              <div 
                key={node.node_id} 
                className="crop-card-aesthetic"
                onClick={() => setSelectedCropNodeId(node.node_id)}
              >
                <div className="crop-top-bar" style={{ background: col }} />

                {/* Card Header: Node ID and Status Pill */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", marginTop: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "800", fontSize: "14px", color: "var(--text)" }}>
                      {node.node_id}
                    </span>
                  </div>
                  <span className={`node-badge ${node.active ? "online" : "offline"}`}>
                    {node.active ? "ACTIVE" : "OFFLINE"}
                  </span>
                </div>

                {/* Crop Hero Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "var(--green-pale)",
                    border: "1px solid var(--green-mid)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    flexShrink: 0
                  }}>
                    {emoji}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)", lineHeight: "1.2" }}>
                      {cropData.crop}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cropData.notes || `Planted ${ageDays ?? 0} days ago`}
                    </div>
                  </div>
                </div>

                {/* Location Badge */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--bg)",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "14px"
                }}>
                  <span>📍</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "600" }}>
                    {cropData.location?.name || "Field Location"}
                  </span>
                </div>

                {/* Compact Sensor Telemetry Vitals */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  background: "var(--bg)",
                  padding: "10px",
                  borderRadius: "10px",
                  textAlign: "center",
                  marginBottom: "14px"
                }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Moisture</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--green)", marginTop: "2px" }}>
                      {node.sensor_json?.humidity !== undefined ? `${node.sensor_json.humidity.toFixed(0)}%` : "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Temp</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--blue)", marginTop: "2px" }}>
                      {node.sensor_json?.temp_c !== undefined ? `${node.sensor_json.temp_c.toFixed(0)}°C` : "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>EC</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--text)", marginTop: "2px" }}>
                      {node.sensor_json?.ec !== undefined ? node.sensor_json.ec.toFixed(1) : "--"}
                    </div>
                  </div>
                </div>

                {/* Sleek Stage Progress Bar */}
                {analysis && (
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", marginBottom: "4px" }}>
                      <span style={{ color: "var(--green-dark)" }}>{analysis.currentStage?.icon} {analysis.currentStage?.name}</span>
                      <span style={{ color: "var(--muted)" }}>{analysis.progressPercent}%</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--divider)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${analysis.progressPercent}%`, background: "var(--green)", borderRadius: "3px" }} />
                    </div>
                  </div>
                )}

                {/* Bottom Row: Harvest Countdown & Click Action */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--divider)"
                }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: analysis?.daysUntilHarvest < 14 ? "#a37a00" : "var(--muted)",
                    background: analysis?.daysUntilHarvest < 14 ? "var(--yellow-pale)" : "transparent",
                    padding: analysis?.daysUntilHarvest < 14 ? "2px 6px" : "0",
                    borderRadius: "4px"
                  }}>
                    {analysis?.daysUntilHarvest === 0
                      ? "🌾 Harvest today"
                      : `⏰ ${analysis?.daysUntilHarvest || 0}d left`}
                  </span>

                  <span style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "var(--green-dark)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>View Details</span>
                    <span className="view-cta-arrow">→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Field Summary Dashboard */}
      <div style={{ marginTop: "32px", padding: "24px", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)" }}>
        <div style={{ fontWeight: "800", marginBottom: "16px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          📊 Field Summary Dashboard
        </div>
        
        {(() => {
          const uniqueCrops = [...new Set(activeCropsList.map(item => item.cropData.crop))];
          const totalArea = activeCropsList.length * 0.5;
          const harvestStats = activeCropsList.map(item => {
            const analysis = analyzeCropGrowth(item.cropData.crop, item.cropData.planted, 0, 0);
            return {
              daysToHarvest: analysis?.daysUntilHarvest || 0,
              isOverdue: analysis?.isOverdue || false,
              progress: analysis?.progressPercent || 0
            };
          });
          
          const nearHarvest = harvestStats.filter(h => h.daysToHarvest < 14 && h.daysToHarvest > 0).length;
          const overdue = harvestStats.filter(h => h.isOverdue).length;
          const avgProgress = harvestStats.length > 0 
            ? Math.round(harvestStats.reduce((sum, h) => sum + h.progress, 0) / harvestStats.length)
            : 0;
          
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
              <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🌾 Active Crops:</span>
                <strong style={{ fontSize: "13px" }}>{uniqueCrops.join(", ") || "None"}</strong>
              </div>
              <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📡 Active Plots:</span>
                <strong style={{ fontSize: "14px" }}>{activeCropsList.length}</strong>
              </div>
              <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📐 Est. Total Area:</span>
                <strong style={{ fontSize: "14px" }}>{totalArea.toFixed(1)} ha</strong>
              </div>
              <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📈 Avg. Growth:</span>
                <strong style={{ fontSize: "14px" }}>{avgProgress}%</strong>
              </div>
              {nearHarvest > 0 && (
                <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--yellow-pale)" }}>
                  <span>🚜 Near Harvest (14d):</span>
                  <strong style={{ fontSize: "14px", color: "#9a7a00" }}>{nearHarvest} plots</strong>
                </div>
              )}
              {overdue > 0 && (
                <div className="metric-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--red-pale)" }}>
                  <span>⚠️ Overdue Harvest:</span>
                  <strong style={{ fontSize: "14px", color: "var(--red)" }}>{overdue} plots</strong>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Modal for Picking Location when adding a new node */}
      {showMapPickerForNew && (
        <MapLocationPicker
          initialLocation={newNode.location}
          cropName={newNode.crop}
          cropEmoji={CROP_EMOJIS[newNode.crop] || "🌱"}
          onSave={(loc) => {
            setNewNode(prev => ({ ...prev, location: loc }));
            setShowMapPickerForNew(false);
          }}
          onClose={() => setShowMapPickerForNew(false)}
        />
      )}
    </div>
  );
}

// ── TAB 4: Weather (Live Open-Meteo Integration) ──────────────────────────
function WeatherTab({ history, nodes, customCrops }) {
  const cropEntries = Object.entries(customCrops || {}).map(([nodeId, cropData]) => ({
    nodeId,
    crop: cropData.crop,
    name: cropData.location?.name || `${cropData.crop} Plot`,
    lat: cropData.location?.lat ?? -2.2472,
    lng: cropData.location?.lng ?? 28.8042,
  }));

  const [selectedKey, setSelectedKey] = useState(cropEntries[0]?.nodeId || (cropEntries.length > 0 ? cropEntries[0].nodeId : "default"));
  const [activeLocation, setActiveLocation] = useState(
    cropEntries[0]
      ? { lat: cropEntries[0].lat, lng: cropEntries[0].lng, name: `${cropEntries[0].crop} (${cropEntries[0].name})` }
      : { lat: -2.2472, lng: 28.8042, name: "Lwiro Agro Station, DR Congo" }
  );
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showWeatherMapPicker, setShowWeatherMapPicker] = useState(false);

  // Automatically keep activeLocation synchronized whenever customCrops or selectedKey changes
  useEffect(() => {
    if (selectedKey !== "gps" && selectedKey !== "custom") {
      const found = cropEntries.find(c => c.nodeId === selectedKey);
      if (found) {
        setActiveLocation({ lat: found.lat, lng: found.lng, name: `${found.crop} (${found.name})` });
      } else if (cropEntries.length > 0) {
        setSelectedKey(cropEntries[0].nodeId);
        setActiveLocation({ lat: cropEntries[0].lat, lng: cropEntries[0].lng, name: `${cropEntries[0].crop} (${cropEntries[0].name})` });
      }
    }
  }, [customCrops, selectedKey]);

  // Fetch real-time weather from Open-Meteo
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchWeatherForecast(activeLocation.lat, activeLocation.lng)
      .then(data => {
        if (active) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load weather forecast:", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [activeLocation.lat, activeLocation.lng]);

  const handleSelectCrop = (e) => {
    const val = e.target.value;
    setSelectedKey(val);
    if (val === "gps") {
      handleUseGps();
      return;
    }
    if (val === "custom_picker") {
      setShowWeatherMapPicker(true);
      return;
    }
    const found = cropEntries.find(c => c.nodeId === val);
    if (found) {
      setActiveLocation({ lat: found.lat, lng: found.lng, name: `${found.crop} (${found.name})` });
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setSelectedKey("gps");
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const acc = Math.round(pos.coords.accuracy || 0);
        setActiveLocation({
          lat,
          lng,
          name: `Device Location (${lat.toFixed(3)}°, ${lng.toFixed(3)}° ±${acc}m)`
        });
      },
      (err) => {
        setGpsLoading(false);
        alert("GPS Error: " + err.message + ". You can also use 'Pick / Search on Map' to search any city or click on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const dailySummary = (history || []).slice(-14).map(h => {
    const humKeys = Object.keys(h).filter(k => k.endsWith("_hum"));
    const avgH = humKeys.length ? humKeys.reduce((s, k) => s + (h[k] || 0), 0) / humKeys.length : 0;
    return {
      label: h.label,
      avg_hum: Number(avgH.toFixed(1)),
      rainfall_mm: 0,
      irrigation_l: 0,
    };
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="section-heading">Live Weather Forecast</div>
          <div className="section-desc">
            Real-time hyper-local meteorological forecasts powered by Open-Meteo for your crops
          </div>
        </div>

        {/* Location & Crop Dropdown Selector & Map Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)" }}>Forecast For:</span>
            <select
              value={selectedKey}
              onChange={handleSelectCrop}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid var(--border)",
                fontSize: "13px",
                fontWeight: "600",
                background: "white",
                color: "var(--text)",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
              }}
            >
              {cropEntries.length === 0 && (
                <option value="default">Default: Lwiro Agro Station</option>
              )}
              {cropEntries.map(c => (
                <option key={c.nodeId} value={c.nodeId}>
                  {c.crop} - {c.name} ({c.nodeId})
                </option>
              ))}
              {selectedKey === "custom" && (
                <option value="custom">🗺️ {activeLocation.name}</option>
              )}
              <option value="gps">📍 Live Device GPS</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowWeatherMapPicker(true)}
            style={{
              background: "white",
              color: "var(--text)",
              border: "1.5px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
            }}
          >
            <span>🗺️</span>
            <span>Pick / Search City</span>
          </button>

          <button
            type="button"
            onClick={handleUseGps}
            disabled={gpsLoading}
            style={{
              background: "var(--blue-pale)",
              color: "var(--blue-dark)",
              border: "1px solid var(--blue-mid)",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "12px",
              cursor: gpsLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{gpsLoading ? "📡" : "📍"}</span>
            <span>{gpsLoading ? "Acquiring GPS..." : "Use Current GPS"}</span>
          </button>
        </div>
      </div>

      {showWeatherMapPicker && (
        <MapLocationPicker
          initialLocation={activeLocation}
          cropName="Weather Location"
          cropEmoji="⛅"
          onSave={(loc) => {
            setSelectedKey("custom");
            setActiveLocation({ lat: loc.lat, lng: loc.lng, name: loc.name });
            setShowWeatherMapPicker(false);
          }}
          onClose={() => setShowWeatherMapPicker(false)}
        />
      )}

      {/* Active Location Banner */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "12px 18px",
        border: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        fontSize: "13px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>📍</span>
          <strong>{activeLocation.name}</strong>
          <span style={{ color: "var(--muted)", fontSize: "12px" }}>
            ({activeLocation.lat.toFixed(4)}°, {activeLocation.lng.toFixed(4)}°)
          </span>
        </div>
        <span style={{
          fontSize: "11px",
          fontWeight: "800",
          background: "var(--green-pale)",
          color: "var(--green-dark)",
          padding: "3px 8px",
          borderRadius: "6px"
        }}>
          LIVE OPEN-METEO FEED
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: "14px" }}>
          📡 Connecting to satellite meteorology & fetching real-time forecast...
        </div>
      ) : weather ? (
        <>
          {/* Current Weather Hero Banner */}
          <div style={{
            background: "linear-gradient(135deg, #1d9cd3 0%, #1580ae 100%)",
            borderRadius: "16px",
            padding: "24px 28px",
            color: "white",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            boxShadow: "0 8px 24px rgba(29,156,211,.2)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ fontSize: "52px" }}>{weather.current.icon}</div>
              <div>
                <div style={{ fontSize: "38px", fontWeight: "800", lineHeight: "1" }}>
                  {weather.current.temp}°C
                </div>
                <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "4px", opacity: 0.95 }}>
                  {weather.current.condition} • Feels like {weather.current.apparentTemp}°C
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: "10px", backdropFilter: "blur(4px)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, fontWeight: "700" }}>Humidity</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>💧 {weather.current.humidity}%</div>
              </div>
              <div style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: "10px", backdropFilter: "blur(4px)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, fontWeight: "700" }}>Wind Speed</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>💨 {weather.current.wind} km/h</div>
              </div>
              <div style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: "10px", backdropFilter: "blur(4px)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, fontWeight: "700" }}>Precipitation</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>🌧️ {weather.current.precipitation} mm</div>
              </div>
            </div>
          </div>

          {/* Real 7-Day Forecast Cards Strip */}
          <div className="weather-strip">
            {weather.daily.map((d, i) => (
              <div key={d.date} className={`weather-day ${i === 0 ? "today" : ""}`}>
                <div className="weather-day-name">{d.day}</div>
                <div className="weather-icon">{d.icon}</div>
                <div className="weather-temps">{d.high}° / {d.low}°</div>
                <div className={`weather-rain ${d.rain === 0 ? "none" : ""}`}>
                  {d.rain > 0 ? `${d.rain}% rain` : "Dry"}
                </div>
                <div style={{ fontSize: 11, color: "var(--blue)", fontWeight: 700, marginTop: 4 }}>
                  💧{d.humidity}%
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  {d.wind} km/h
                </div>
              </div>
            ))}
          </div>

          {/* Intelligent Irrigation Advisory based on Real Weather Forecast */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Forecast-Driven Irrigation Advisory</div>
            <div className="card-sub">Dynamic recommendations calculated from 7-day upcoming rain data</div>
            <div className="alert-strip" style={{ marginBottom: 0 }}>
              <div className={`alert-card ${weather.irrigationAdvice.type === "rain" ? "ok" : weather.irrigationAdvice.type === "heat" ? "warning" : "ok"}`}>
                <div className="alert-icon">{weather.irrigationAdvice.icon}</div>
                <div>
                  <div className="alert-title">{weather.irrigationAdvice.title}</div>
                  <div className="alert-desc">{weather.irrigationAdvice.desc}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Historical Water Summary Chart */}
      <div className="card">
        <div className="card-title">Daily Water History: Recent Activity</div>
        <div className="card-sub">Soil humidity, rainfall received, and irrigation applied</div>
        {dailySummary.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "var(--muted)", fontSize: 13 }}>
            No historical water data recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySummary} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "Nunito Sans", fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Nunito Sans", fill: "var(--muted)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Nunito Sans", fontWeight: 600 }} />
              <Bar dataKey="avg_hum" name="Avg Soil Humidity (%)" fill="#1a9c3e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rainfall_mm" name="Rainfall (mm)" fill="#1d9cd3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="irrigation_l" name="Irrigation Applied (L)" fill="#f5c518" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── TAB 5: Recommendations ────────────────────────────────────────────────
function RecommendationsTab({ nodes }) {
  const recs = [];

  nodes.forEach(n => {
    const hum  = n.sensor_json?.humidity||0;
    const temp = n.sensor_json?.temp_c||0;
    const ec   = n.sensor_json?.ec||0;

    if (!n.active) {
      recs.push({ type:"warning", icon:"📡", title:`${n.node_id} is offline`, node:n.node_id,
        body:"This sensor has not sent data recently. Check device power and mesh connection.",
        action:"Check device" });
      return;
    }
    if (hum<25) {
      recs.push({ type:"urgent", icon:"🚨", title:`Critical moisture: irrigate ${n.node_id} now`, node:n.node_id,
        body:`Soil humidity critically low at ${hum.toFixed(1)}%. Crops at immediate risk of stress. Irrigate right away.`,
        action:"Irrigate immediately" });
    } else if (hum<MOISTURE_THRESHOLD) {
      recs.push({ type:"warning", icon:"💧", title:`${n.node_id} needs irrigation soon`, node:n.node_id,
        body:`Humidity at ${hum.toFixed(1)}% : below ${MOISTURE_THRESHOLD}% threshold. Plan irrigation within 12 hours.`,
        action:"Schedule irrigation" });
    } else if (hum>80) {
      recs.push({ type:"info", icon:"🌊", title:`${n.node_id} : excess moisture detected`, node:n.node_id,
        body:`Humidity at ${hum.toFixed(1)}% is very high. Risk of root disease. Pause irrigation and check drainage.`,
        action:"Check drainage" });
    } else {
      recs.push({ type:"good", icon:"✅", title:`${n.node_id} : moisture optimal`, node:n.node_id,
        body:`Soil humidity at ${hum.toFixed(1)}% is within the ideal range. No irrigation action needed.`,
        action:"No action needed" });
    }
    if (ec>3.0) {
      recs.push({ type:"warning", icon:"⚡", title:`High salt levels at ${n.node_id}`, node:n.node_id,
        body:`EC at ${ec.toFixed(2)} mS/cm : possible over-fertilization or salt buildup. Flush with fresh water.`,
        action:"Flush with water" });
    } else if (ec<0.8) {
      recs.push({ type:"info", icon:"🌿", title:`Low nutrients at ${n.node_id}`, node:n.node_id,
        body:`EC at ${ec.toFixed(2)} mS/cm suggests low nutrients. Apply balanced fertilizer at next irrigation.`,
        action:"Apply fertilizer" });
    }
    if (temp>35) {
      recs.push({ type:"warning", icon:"🌡️", title:`High soil temperature at ${n.node_id}`, node:n.node_id,
        body:`Soil at ${temp.toFixed(1)}°C. Apply mulch to reduce temperature and retain moisture. Water in early morning.`,
        action:"Apply mulch" });
    }
  });

  return (
    <div>
      <div className="section-heading">Recommendations</div>
      <div className="section-desc">Actions based on live sensor readings, historical trends, and weather forecast</div>
      {recs.length===0 ? (
        <div className="card" style={{textAlign:"center",padding:"48px 0"}}>
          <div style={{fontSize:32,marginBottom:12}}>🌿</div>
          <div style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:16,color:"var(--green)"}}>All systems healthy</div>
          <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>No actions required at this time</div>
        </div>
      ) : (
        <div className="rec-grid">
          {recs.map((r,i) => (
            <div key={i} className={`rec-card ${r.type}`}>
              <div className="rec-header">
                <div className="rec-icon">{r.icon}</div>
                <div>
                  <div className="rec-title">{r.title}</div>
                  <div className="rec-node">{r.node}</div>
                </div>
              </div>
              <div className="rec-body">{r.body}</div>
              <span className="rec-action">{r.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────
export default function MainApp() {
  const [tab, setTab]         = useState("dashboard");
  const [nodes, setNodes]     = useState([]);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLast] = useState(new Date());

  // Central crop state loaded strictly from database and user creations
  const [customCrops, setCustomCrops] = useState(() => {
    try {
      const saved = localStorage.getItem("fsl_custom_crops");
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned = {};
        for (const [k, v] of Object.entries(parsed)) {
          const isDummy = (
            v?.notes === "Main field with automated drip line" ||
            v?.notes === "Greenhouse Alpha - Roma Tomato" ||
            v?.notes === "High ridge sector B" ||
            v?.notes === "Drip fed with bio-fertilizer" ||
            v?.notes === "Main Plot North - Hybrid White Maize" ||
            v?.variety?.includes("SC627") ||
            v?.variety?.includes("Roma VF")
          );
          if (!isDummy) {
            cleaned[k] = v;
          }
        }
        return cleaned;
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fsl_custom_crops", JSON.stringify(customCrops));
    } catch (e) {
      console.error("Failed to save custom crops:", e);
    }
  }, [customCrops]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [nodesData, histData, cropsData] = await Promise.all([
          getNodes(),
          getHistory(48),
          getCrops()
        ]);
        if (active) {
          setNodes(Array.isArray(nodesData) ? nodesData : []);
          setHistory(Array.isArray(histData) ? histData : []);
          setLast(new Date());

          // Build customCrops strictly from database rows
          if (Array.isArray(cropsData)) {
            setCustomCrops(prev => {
              const updated = {};
              for (const c of cropsData) {
                if (c.node_id) {
                  updated[c.node_id] = {
                    crop: c.crop,
                    planted: c.planted,
                    notes: c.notes || "",
                    location: {
                      lat: c.lat !== null && c.lat !== undefined ? Number(c.lat) : -2.2472,
                      lng: c.lng !== null && c.lng !== undefined ? Number(c.lng) : 28.8042,
                      name: c.location_name || "Field Location"
                    }
                  };
                }
              }
              // Preserve any newly registered node from current user session that hasn't synced
              for (const [k, v] of Object.entries(prev)) {
                if (!updated[k]) {
                  updated[k] = v;
                }
              }
              return updated;
            });
          }
        }
      } catch(e) { console.error("Poll error:", e); }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const TABS = [
    { id:"dashboard",       label:"Dashboard" },
    { id:"history",         label:"History" },
    { id:"crops",           label:"Crops" },
    { id:"weather",         label:"Weather" },
    { id:"recommendations", label:"Recommendations" },
  ];

  return (
    <>
      <style>{css}</style>

      <header className="app-header">
        <div className="brand">
          <BrandLogo/>
          <div className="brand-divider"/>
          <div>
            <div className="brand-product">Farmer Solutions</div>
            <div className="brand-product-sub">Dashboard</div>
          </div>
        </div>
        <div className="header-right">
          <div className="live-pill">
            <div className="live-dot"/>
            Live
          </div>
          <div className="update-time">Updated {lastUpdate.toLocaleTimeString()}</div>
        </div>
      </header>

      <nav className="nav-bar">
        {TABS.map(t => (
          <button key={t.id} className={`nav-tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab==="dashboard"       && <DashboardTab nodes={nodes} history={history}/>}
        {tab==="history"         && <HistoryTab   nodes={nodes} history={history}/>}
        {tab==="crops"           && <CropsTab     nodes={nodes} customCrops={customCrops} setCustomCrops={setCustomCrops}/>}
        {tab==="weather"         && <WeatherTab   history={history} nodes={nodes} customCrops={customCrops}/>}
        {tab==="recommendations" && <RecommendationsTab nodes={nodes}/>}
      </main>

      <footer className="brand-footer">
        <div className="footer-brand">
          <div className="footer-dot"/>
          <span>© 2026 Future Solutions Ltd : Farmer Solutions</span>
        </div>
        <div style={{fontSize:12,color:"var(--muted)"}}>
          {nodes.filter(n=>n.active).length} of {nodes.length} nodes active
        </div>
      </footer>
    </>
  );
}
