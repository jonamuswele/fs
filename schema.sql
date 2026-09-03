-- Future Solutions Farm Platform Schema
-- Cloudflare D1 SQLite Compatible

CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  size_ha REAL DEFAULT 0,
  phone TEXT,
  joined TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  node_id TEXT,
  crop TEXT NOT NULL,
  planted TEXT,
  area_ha REAL DEFAULT 0,
  lat REAL,
  lng REAL,
  location_name TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL,
  mac TEXT,
  label TEXT,
  active INTEGER DEFAULT 1,
  uptime_s INTEGER DEFAULT 0,
  count INTEGER DEFAULT 0,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL,
  farm_id TEXT,
  temp_c REAL,
  humidity REAL,
  ec REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_readings_node ON readings(node_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_time ON readings(timestamp DESC);

CREATE TABLE IF NOT EXISTS tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id TEXT,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'device',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default initial API Key for devices (can be managed or overridden via environment variable)
INSERT OR IGNORE INTO api_keys (id, key, name, role) 
VALUES (1, 'fsl_live_7a9f8b2c4e1d6a0e', 'Default Farm Ingest Key', 'device');

-- Default Farm Seed
INSERT OR IGNORE INTO farms (id, name, location, size_ha, phone, joined, status) 
VALUES ('FSL-001', 'Future Solutions Farm', 'Bukavu, DR Congo', 5.0, '+243 000 000 000', '2026-01-01', 'active');

