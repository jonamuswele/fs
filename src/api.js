// Centralized API client for Future Solutions
// Handles communication with Hono backend on Cloudflare Workers

// Use custom backend Worker URL if provided, otherwise default to relative /api
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api` 
  : "/api";

export async function getHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Health check error:", err);
    return { status: "error", message: err.message };
  }
}

export async function getNodes() {
  try {
    const res = await fetch(`${API_BASE}/nodes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch nodes:", err);
    return [];
  }
}

export async function getHistory(limit = 48) {
  try {
    const res = await fetch(`${API_BASE}/history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch history:", err);
    return [];
  }
}

export async function getFarms() {
  try {
    const res = await fetch(`${API_BASE}/farms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch farms:", err);
    return [];
  }
}

export async function createFarm(farmData) {
  const res = await fetch(`${API_BASE}/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(farmData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getTips() {
  try {
    const res = await fetch(`${API_BASE}/tips`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch tips:", err);
    return [];
  }
}

export async function addTip(tipData) {
  const res = await fetch(`${API_BASE}/tips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tipData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getApiKeys() {
  try {
    const res = await fetch(`${API_BASE}/keys`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch keys:", err);
    return { active_key: "fsl_live_7a9f8b2c4e1d6a0e", keys: [] };
  }
}

export async function ingestTelemetry(payload, apiKey = "fsl_live_7a9f8b2c4e1d6a0e") {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function resetDatabase(target = "readings") {
  const res = await fetch(`${API_BASE}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getCrops(farmId) {
  try {
    const url = farmId ? `${API_BASE}/crops?farm_id=${farmId}` : `${API_BASE}/crops`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch crops:", err);
    return [];
  }
}

export async function saveCrop(cropData) {
  const res = await fetch(`${API_BASE}/crops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cropData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function registerNode(nodeData) {
  const res = await fetch(`${API_BASE}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nodeData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}
