// Servidor de FacturaPro: el PDF se hace en el navegador.
// Aquí solo se cobra el pase ilimitado y se cuenta el límite gratis.

const crypto = require('crypto');

const FREE_PER_MONTH = 3;
const PRODUCT = {
  sku: 'lifetime',
  name: 'FacturaPro ilimitado',
  amount: 900
};

function sendJson(res, code, obj, headers) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (headers) {
    Object.keys(headers).forEach(function (key) {
      res.setHeader(key, headers[key]);
    });
  }
  res.end(JSON.stringify(obj));
}

function readRaw(req) {
  return new Promise(function (resolve, reject) {
    if (typeof req.body === 'string') return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
    if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
    var chunks = [];
    req.on('data', function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  var raw = await readRaw(req);
  if (!raw || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function secret() {
  return process.env.APP_SECRET || process.env.STRIPE_SECRET_KEY || '';
}

function stripeOn() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function supabaseOn() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function signToken(payload, key) {
  var body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  var sig = crypto.createHmac('sha256', key).update(body).digest('base64url');
  return body + '.' + sig;
}

function verifyToken(token, key) {
  if (!token || !key || token.indexOf('.') === -1) return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var expected = crypto.createHmac('sha256', key).update(parts[0]).digest('base64url');
  var left = Buffer.from(parts[1]);
  var right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
  catch (err) { return null; }
}

function cleanDevice(value) {
  var id = String(value || '');
  return /^[a-zA-Z0-9-]{8,80}$/.test(id) ? id : '';
}

function cleanEmail(value) {
  var email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 120 || /['"\\\s]/.test(email)) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function cleanInvoiceId(value) {
  var id = String(value || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(id) ? id : '';
}

function madridMonth(date) {
  var day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date || new Date());
  return day.slice(0, 7);
}

function readCookie(req, name) {
  var header = req.headers.cookie || '';
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var piece = parts[i].trim();
    var eq = piece.indexOf('=');
    if (eq === -1 || piece.slice(0, eq) !== name) continue;
    try { return decodeURIComponent(piece.slice(eq + 1)); }
    catch (err) { return piece.slice(eq + 1); }
  }
  return '';
}

function cookieHeader(req, name, value) {
  var host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  var local = host.indexOf('localhost') !== -1 || host.indexOf('127.0.0.1') !== -1;
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=34560000' + (local ? '' : '; Secure');
}

function bearer(req) {
  var header = req.headers.authorization || '';
  return header.indexOf('Bearer ') === 0 ? header.slice(7).trim() : '';
}

function readPro(token, deviceId) {
  var key = secret();
  if (!token || !key || !deviceId) return null;
  var payload = verifyToken(token, key);
  if (!payload || payload.app !== 'facturapro' || payload.lifetime !== true) return null;
  if (payload.deviceId !== deviceId) return null;
  return payload;
}

function publicOrigin(req) {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/$/, '');
  var proto = req.headers['x-forwarded-proto'] || 'https';
  var host = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}

async function stripeRequest(method, path, params, extraHeaders) {
  if (!stripeOn()) {
    var missing = new Error('Falta STRIPE_SECRET_KEY');
    missing.status = 500;
    throw missing;
  }
  var opts = {
    method: method,
    headers: Object.assign({
      Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY
    }, extraHeaders || {})
  };
  if (params) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = params instanceof URLSearchParams ? params.toString() : String(params);
  }
  var res = await fetch('https://api.stripe.com' + path, opts);
  var data = await res.json();
  if (!res.ok) {
    var err = new Error((data.error && data.error.message) || 'Stripe ha rechazado la petición');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function sb(path, options) {
  var base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  var res = await fetch(base + '/rest/v1/' + path, {
    method: (options && options.method) || 'GET',
    headers: Object.assign({
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    }, (options && options.headers) || {}),
    body: options && options.body ? JSON.stringify(options.body) : undefined
  });
  var text = await res.text();
  var data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    var err = new Error('Supabase no ha respondido bien');
    err.status = res.status;
    throw err;
  }
  return data;
}

function proTokenFor(deviceId, email) {
  return signToken({
    app: 'facturapro',
    lifetime: true,
    deviceId: deviceId,
    email: email || ''
  }, secret());
}

async function markPremium(deviceId, email) {
  if (!supabaseOn()) return;
  await sb('devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: deviceId,
      email: email || null,
      premium: true
    }
  });
}

async function takeSlot(req, deviceId, invoiceId, token) {
  if (readPro(token, deviceId)) return { ok: true, premium: true, left: null, mode: 'pro' };
  if (supabaseOn()) return takeSupabase(deviceId, invoiceId);
  if (!secret()) return { ok: true, mode: 'local', left: null };
  return takeCookie(req, invoiceId);
}

async function takeSupabase(deviceId, invoiceId) {
  var month = madridMonth();
  var rows = await sb('devices?id=eq.' + encodeURIComponent(deviceId) + '&select=*', { method: 'GET' });
  var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (row && row.premium) return { ok: true, premium: true, left: null, mode: 'supabase' };
  var ids = row && row.free_month === month && Array.isArray(row.invoice_ids) ? row.invoice_ids.slice() : [];
  if (ids.indexOf(invoiceId) === -1) {
    if (ids.length >= FREE_PER_MONTH) {
      return { ok: false, premium: false, left: 0, mode: 'supabase' };
    }
    ids.push(invoiceId);
  }
  await sb('devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: deviceId,
      email: row && row.email ? row.email : null,
      premium: false,
      free_month: month,
      invoice_ids: ids
    }
  });
  return { ok: true, premium: false, left: FREE_PER_MONTH - ids.length, mode: 'supabase' };
}

function takeCookie(req, invoiceId) {
  var month = madridMonth();
  var key = secret();
  var current = verifyToken(readCookie(req, 'fp_quota'), key);
  var ids = current && current.month === month && Array.isArray(current.ids) ? current.ids.slice() : [];
  var changed = false;
  if (ids.indexOf(invoiceId) === -1) {
    if (ids.length >= FREE_PER_MONTH) {
      return { ok: false, premium: false, left: 0, mode: 'cookie' };
    }
    ids.push(invoiceId);
    changed = true;
  }
  var headers = changed
    ? { 'Set-Cookie': cookieHeader(req, 'fp_quota', signToken({ app: 'facturapro-quota', month: month, ids: ids }, key)) }
    : undefined;
  return { ok: true, premium: false, left: FREE_PER_MONTH - ids.length, mode: 'cookie', headers: headers };
}

module.exports = {
  FREE_PER_MONTH: FREE_PER_MONTH,
  PRODUCT: PRODUCT,
  sendJson: sendJson,
  readJson: readJson,
  secret: secret,
  stripeOn: stripeOn,
  supabaseOn: supabaseOn,
  cleanDevice: cleanDevice,
  cleanEmail: cleanEmail,
  cleanInvoiceId: cleanInvoiceId,
  madridMonth: madridMonth,
  bearer: bearer,
  readPro: readPro,
  publicOrigin: publicOrigin,
  stripeRequest: stripeRequest,
  proTokenFor: proTokenFor,
  markPremium: markPremium,
  takeSlot: takeSlot,
  signToken: signToken,
  verifyToken: verifyToken
};
