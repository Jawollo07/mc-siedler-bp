const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// ==================== KONFIGURATION ====================
const CONFIG = {
  PORT: process.env.PORT || 883,
  CODE_LENGTH: 6,
  CODE_TTL_MS: 15 * 60 * 1000,          // 15 Minuten
  CLEANUP_INTERVAL_MS: 60 * 1000,       // alle 60 Sekunden
  USED_CODE_KEEP_MS: 24 * 60 * 60 * 1000, // verwendete Codes 24h behalten (für Logs)
  RATE_LIMIT_WINDOW_MS: 60 * 1000,      // 1 Minute
  RATE_LIMIT_GENERATE: 5,               // max. 5 Codes pro Minute pro IP
  RATE_LIMIT_VERIFY: 15,                // max. 15 Verify-Versuche pro Minute pro IP
  ADMIN_KEY: process.env.ADMIN_KEY || '',
  DATA_FILE: path.join(__dirname, 'codes.json')
};

// ==================== DATEN ====================
let codes = {};

function loadCodes() {
  try {
    if (fs.existsSync(CONFIG.DATA_FILE)) {
      codes = JSON.parse(fs.readFileSync(CONFIG.DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[LOAD] Fehler beim Laden der Codes:', err.message);
    codes = {};
  }
}

function saveCodes() {
  try {
    const tmp = CONFIG.DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(codes, null, 2));
    fs.renameSync(tmp, CONFIG.DATA_FILE);
  } catch (err) {
    console.error('[SAVE] Fehler beim Speichern:', err.message);
  }
}

loadCodes();

// ==================== HILFSFUNKTIONEN ====================
function log(type, msg) {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[\( {time}] [ \){type}] ${msg}`);
}

function generateCode() {
  // Immer 6 Stellen, keine führende Null
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (codes[code]);
  return code;
}

function isExpired(entry) {
  return Date.now() - entry.created > CONFIG.CODE_TTL_MS;
}

function cleanup() {
  const now = Date.now();
  let removed = 0;

  for (const code in codes) {
    const entry = codes[code];

    // Abgelaufene unbenutzte Codes löschen
    if (!entry.used && now - entry.created > CONFIG.CODE_TTL_MS) {
      delete codes[code];
      removed++;
      continue;
    }

    // Alte verwendete Codes nach X Stunden löschen
    if (entry.used && entry.usedAt && now - entry.usedAt > CONFIG.USED_CODE_KEEP_MS) {
      delete codes[code];
      removed++;
    }
  }

  if (removed > 0) {
    saveCodes();
    log('CLEANUP', `${removed} abgelaufene/alte Codes entfernt`);
  }
}

setInterval(cleanup, CONFIG.CLEANUP_INTERVAL_MS);

// ==================== RATE LIMITING ====================
const rateLimits = new Map(); // ip -> { generate: [], verify: [] }

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.socket.remoteAddress ||
         'unknown';
}

function checkRateLimit(ip, type, max) {
  const now = Date.now();
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { generate: [], verify: [] });
  }

  const entry = rateLimits.get(ip);
  entry[type] = entry[type].filter(t => now - t < CONFIG.RATE_LIMIT_WINDOW_MS);

  if (entry[type].length >= max) {
    return false;
  }

  entry[type].push(now);
  return true;
}

// Alte Rate-Limit-Einträge gelegentlich aufräumen
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimits) {
    data.generate = data.generate.filter(t => now - t < CONFIG.RATE_LIMIT_WINDOW_MS);
    data.verify = data.verify.filter(t => now - t < CONFIG.RATE_LIMIT_WINDOW_MS);
    if (data.generate.length === 0 && data.verify.length === 0) {
      rateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Einfaches Request-Logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    log('REQ', `${req.method} ${req.path} from ${getClientIp(req)}`);
  }
  next();
});

// Admin-Auth Middleware
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== CONFIG.ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// ==================== ÖFFENTLICHE API ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    activeCodes: Object.values(codes).filter(c => !c.used && !isExpired(c)).length
  });
});

// Code generieren
app.post('/api/generate', (req, res) => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip, 'generate', CONFIG.RATE_LIMIT_GENERATE)) {
    return res.status(429).json({
      success: false,
      message: 'Zu viele Anfragen. Bitte warte eine Minute.'
    });
  }

  cleanup();

  const code = generateCode();
  const now = Date.now();

  codes[code] = {
    created: now,
    used: false,
    usedBy: null,
    usedAt: null,
    generatedByIp: ip
  };
  saveCodes();

  log('GENERATE', `Code ${code} erstellt (IP: ${ip})`);

  res.json({
    success: true,
    code,
    expiresInSeconds: Math.floor(CONFIG.CODE_TTL_MS / 1000),
    expiresInMinutes: Math.floor(CONFIG.CODE_TTL_MS / 60000)
  });
});

// Code verifizieren
app.post('/api/verify', (req, res) => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip, 'verify', CONFIG.RATE_LIMIT_VERIFY)) {
    return res.status(429).json({
      success: false,
      message: 'Zu viele Versuche. Bitte warte eine Minute.'
    });
  }

  cleanup();

  const { code, player } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Kein Code angegeben'
    });
  }

  // Nur Ziffern, genau 6 Stellen
  const cleaned = code.trim().replace(/\D/g, '');
  if (cleaned.length !== CONFIG.CODE_LENGTH) {
    return res.json({
      success: false,
      message: `Code muss aus genau ${CONFIG.CODE_LENGTH} Zahlen bestehen`
    });
  }

  const entry = codes[cleaned];

  if (!entry) {
    log('VERIFY', `Ungültiger Code ${cleaned} von ${player || 'unknown'} (IP: ${ip})`);
    return res.json({
      success: false,
      message: 'Ungültiger oder abgelaufener Code'
    });
  }

  if (isExpired(entry)) {
    delete codes[cleaned];
    saveCodes();
    log('VERIFY', `Abgelaufener Code ${cleaned} von ${player || 'unknown'}`);
    return res.json({
      success: false,
      message: 'Code ist abgelaufen (max. 15 Minuten)'
    });
  }

  if (entry.used) {
    log('VERIFY', `Bereits verwendeter Code ${cleaned} von ${player || 'unknown'}`);
    return res.json({
      success: false,
      message: 'Code wurde bereits verwendet'
    });
  }

  // Erfolgreich
  entry.used = true;
  entry.usedBy = player || 'unknown';
  entry.usedAt = Date.now();
  entry.verifiedFromIp = ip;
  saveCodes();

  log('VERIFY', `✓ Code ${cleaned} akzeptiert für ${entry.usedBy} (IP: ${ip})`);

  res.json({
    success: true,
    message: 'Code akzeptiert'
  });
});

// Status eines Codes
app.get('/api/status/:code', (req, res) => {
  cleanup();

  const cleaned = (req.params.code || '').replace(/\D/g, '');
  const entry = codes[cleaned];

  if (!entry) {
    return res.json({ exists: false });
  }

  const remainingMs = Math.max(0, CONFIG.CODE_TTL_MS - (Date.now() - entry.created));

  res.json({
    exists: true,
    used: entry.used,
    usedBy: entry.usedBy || null,
    remainingSeconds: entry.used ? 0 : Math.floor(remainingMs / 1000),
    expired: !entry.used && remainingMs === 0
  });
});

// ==================== ADMIN API ====================
// Header: X-Admin-Key: dein-schlüssel
// oder ?key=dein-schlüssel

// Statistiken
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  cleanup();

  const all = Object.values(codes);
  const active = all.filter(c => !c.used && !isExpired(c));
  const used = all.filter(c => c.used);
  const expired = all.filter(c => !c.used && isExpired(c));

  res.json({
    success: true,
    stats: {
      totalStored: all.length,
      active: active.length,
      used: used.length,
      expired: expired.length
    }
  });
});

// Aktive Codes auflisten
app.get('/api/admin/codes', requireAdmin, (req, res) => {
  cleanup();

  const list = Object.entries(codes)
    .map(([code, entry]) => ({
      code,
      created: new Date(entry.created).toISOString(),
      used: entry.used,
      usedBy: entry.usedBy,
      usedAt: entry.usedAt ? new Date(entry.usedAt).toISOString() : null,
      remainingSeconds: entry.used
        ? 0
        : Math.max(0, Math.floor((CONFIG.CODE_TTL_MS - (Date.now() - entry.created)) / 1000))
    }))
    .sort((a, b) => b.created.localeCompare(a.created));

  res.json({ success: true, codes: list });
});

// Bestimmten Code löschen / widerrufen
app.delete('/api/admin/codes/:code', requireAdmin, (req, res) => {
  const cleaned = (req.params.code || '').replace(/\D/g, '');

  if (!codes[cleaned]) {
    return res.status(404).json({ success: false, message: 'Code nicht gefunden' });
  }

  delete codes[cleaned];
  saveCodes();
  log('ADMIN', `Code ${cleaned} manuell gelöscht`);

  res.json({ success: true, message: 'Code gelöscht' });
});

// Alle abgelaufenen / alten Codes bereinigen
app.post('/api/admin/cleanup', requireAdmin, (req, res) => {
  const before = Object.keys(codes).length;
  cleanup();
  const after = Object.keys(codes).length;

  res.json({
    success: true,
    removed: before - after,
    remaining: after
  });
});

// ==================== SERVER START ====================
app.listen(CONFIG.PORT, () => {
  log('START', `Rules-Verify läuft auf http://localhost:${CONFIG.PORT}`);
  log('START', `Code-Gültigkeit: ${CONFIG.CODE_TTL_MS / 60000} Minuten`);
  log('START', `Admin-Key: ${CONFIG.ADMIN_KEY === 'super-secret-admin-key-change-me' ? '⚠ NOCH STANDARD – bitte ändern!' : 'gesetzt'}`);
});