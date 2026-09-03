// Centralized API client for Future Solutions
// Handles communication with Hono backend on Cloudflare Workers

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("fsl_api_url");
    if (custom && custom.trim()) {
      return `${custom.trim().replace(/\/api\/?$/, "").replace(/\/$/, "")}/api`;
    }
  }
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "")}/api`;
  }
  return "/api";
}

export function setApiBaseUrl(url) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("fsl_api_url");
    } else {
      localStorage.setItem("fsl_api_url", url.trim().replace(/\/api\/?$/, "").replace(/\/$/, ""));
    }
  }
}

export async function testApiConnection(customUrl) {
  const base = customUrl 
    ? `${customUrl.trim().replace(/\/api\/?$/, "").replace(/\/$/, "")}/api`
    : getApiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function getHealth() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Health check error:", err);
    return { status: "error", message: err.message };
  }
}

export async function getNodes() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/nodes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch nodes:", err);
    return [];
  }
}

export async function getHistory(limit = 48) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch history:", err);
    return [];
  }
}

export async function getFarms() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/farms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch farms:", err);
    return [];
  }
}

export async function createFarm(farmData) {
  const res = await fetch(`${getApiBaseUrl()}/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(farmData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getTips() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/tips`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch tips:", err);
    return [];
  }
}

export async function addTip(tipData) {
  const res = await fetch(`${getApiBaseUrl()}/tips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tipData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getApiKeys() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/keys`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch keys:", err);
    return { active_key: "fsl_live_7a9f8b2c4e1d6a0e", keys: [] };
  }
}

export async function ingestTelemetry(payload, apiKey = "fsl_live_7a9f8b2c4e1d6a0e") {
  const res = await fetch(`${getApiBaseUrl()}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function resetDatabase(target = "readings") {
  const res = await fetch(`${getApiBaseUrl()}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getCrops(farmId) {
  try {
    const base = getApiBaseUrl();
    const url = farmId ? `${base}/crops?farm_id=${farmId}` : `${base}/crops`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch crops:", err);
    return [];
  }
}

export async function saveCrop(cropData) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/crops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cropData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function registerNode(nodeData) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nodeData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}
