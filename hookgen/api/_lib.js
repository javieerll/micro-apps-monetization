// Utilidades de servidor: Stripe, créditos, firma y Supabase.
// Este archivo no es una ruta. Vive junto a las funciones y no se publica como página.

const crypto = require('crypto');

const FREE_PER_DAY = 3;

// Importes en céntimos. El precio que pongas es el que paga el cliente.
// Si tienes que repercutir IVA, súbelo aquí para que el total ya lo lleve.
const CATALOG = {
  week: {
    sku: 'week',
    name: 'HookGen Pro · 7 días',
    amount: 299,
    days: 7,
    credits: 0
  },
  month: {
    sku: 'month',
    name: 'HookGen Pro · 30 días',
    amount: 699,
    days: 30,
    credits: 0
  },
  pack50: {
    sku: 'pack50',
    name: 'HookGen · 50 créditos',
    amount: 499,
    days: 0,
    credits: 50
  }
};

const PLATFORMS = ['tiktok', 'reels', 'shorts', 'instagram'];
const TONES = ['directo', 'historia', 'polemico', 'util', 'curioso'];

const SYSTEM_PROMPT = [
  'Eres copywriter de vídeos cortos en español de España.',
  'Hablas como una persona concreta, no como un anuncio.',
  'Prohibido: "en el mundo actual", "descubre el secreto", "desata tu potencial", "en este vídeo te cuento", hashtags y emojis.',
  'Cada hook se puede decir en voz alta en menos de 4 segundos. Máximo 22 palabras.',
  'Devuelve solo JSON con esta forma:',
  '{"hooks":[{"hook":"","caption":"","cta":"","pattern":""}]}',
  'Exactamente 5 elementos.',
  'pattern es una de: directo, historia, polemico, util, curioso.',
  'caption: dos frases que desarrollan el hook sin repetirlo entero.',
  'cta: una frase corta para el cierre, sin pedir likes.'
].join('\n');

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
    if (req.body && typeof req.body === 'object') {
      var err = new Error('parsed');
      err.parsed = req.body;
      return reject(err);
    }
    var chunks = [];
    req.on('data', function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
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
  try {
    var payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function cleanDevice(value) {
  var id = String(value || '');
  return /^[a-zA-Z0-9-]{8,80}$/.test(id) ? id : '';
}

function cleanEmail(value) {
  var email = String(value || '').trim().toLowerCase();
  if (!email) return '';
  if (email.length > 120 || /['"\\\s]/.test(email)) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function madridDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date || new Date());
}

function readCookie(req, name) {
  var header = req.headers.cookie || '';
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var piece = parts[i].trim();
    var eq = piece.indexOf('=');
    if (eq === -1) continue;
    if (piece.slice(0, eq) !== name) continue;
    try { return decodeURIComponent(piece.slice(eq + 1)); }
    catch (err) { return piece.slice(eq + 1); }
  }
  return '';
}

function cookieHeader(req, name, value) {
  var host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  var local = host.indexOf('localhost') !== -1 || host.indexOf('127.0.0.1') !== -1;
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=172800' + (local ? '' : '; Secure');
}

function readPro(req, deviceId) {
  var header = req.headers.authorization || '';
  if (header.indexOf('Bearer ') !== 0) return null;
  var key = secret();
  if (!key || !deviceId) return null;
  var payload = verifyToken(header.slice(7).trim(), key);
  if (!payload || payload.app !== 'hookgen' || payload.deviceId !== deviceId) return null;
  if (!payload.proUntil || Date.now() > Number(payload.proUntil)) return null;
  return payload;
}

function supabaseOn() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function stripeOn() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
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
    err.detail = data;
    throw err;
  }
  return data;
}

async function stripeRequest(method, path, params, extraHeaders) {
  if (!stripeOn()) {
    var missing = new Error('Falta STRIPE_SECRET_KEY');
    missing.status = 500;
    throw missing;
  }
  var opts = {
    method: method,
    headers: Object.assign(
      { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY },
      extraHeaders || {}
    )
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

function verifyStripeSignature(raw, header, key) {
  if (!raw || !header || !key) return false;
  var timestamp = '';
  var signatures = [];
  header.split(',').forEach(function (item) {
    var pair = item.split('=');
    if (pair[0] === 't') timestamp = pair[1];
    if (pair[0] === 'v1' && pair[1]) signatures.push(pair[1]);
  });
  if (!timestamp || !signatures.length) return false;
  var age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  var expected = crypto.createHmac('sha256', key).update(timestamp + '.' + raw).digest('hex');
  var right = Buffer.from(expected);
  return signatures.some(function (sig) {
    var left = Buffer.from(sig);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

function passExpiry(payments) {
  var list = (payments || []).filter(function (item) {
    return Number(item.days) > 0;
  }).sort(function (a, b) {
    return Number(a.created) - Number(b.created);
  });
  var expiry = 0;
  list.forEach(function (item) {
    var start = Math.max(expiry, Number(item.created) * 1000);
    expiry = start + Number(item.days) * 86400000;
  });
  return expiry;
}

function mapPayment(pi) {
  return {
    id: pi.id,
    created: Number(pi.created) || 0,
    days: Number(pi.metadata && pi.metadata.days) || 0,
    credits: Number(pi.metadata && pi.metadata.credits) || 0,
    status: pi.status
  };
}

async function searchPayments(email) {
  var query = "status:'succeeded' AND metadata['app']:'hookgen' AND metadata['email']:'" + email + "'";
  var data = await stripeRequest('GET', '/v1/payment_intents/search?limit=20&query=' + encodeURIComponent(query));
  return (data.data || []).map(mapPayment);
}

async function consumeCredit(req, deviceId, pro) {
  if (pro) {
    return {
      ok: true,
      usage: { mode: 'pro', left: null, proUntil: Number(pro.proUntil), limit: FREE_PER_DAY }
    };
  }

  if (supabaseOn()) {
    if (!deviceId) {
      var missingDevice = new Error('Falta el identificador de este navegador');
      missingDevice.status = 400;
      throw missingDevice;
    }
    return consumeSupabase(deviceId);
  }

  if (!secret()) {
    return { ok: true, usage: { mode: 'local', left: null, proUntil: null, limit: FREE_PER_DAY } };
  }

  return consumeCookie(req);
}

async function consumeSupabase(deviceId) {
  var today = madridDay();
  var rows = await sb('devices?id=eq.' + encodeURIComponent(deviceId) + '&select=*', { method: 'GET' });
  var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  var freeUsed = row && row.free_day === today ? Number(row.free_used) || 0 : 0;
  var bonus = row ? Number(row.bonus_credits) || 0 : 0;
  var mode = 'supabase';

  if (freeUsed < FREE_PER_DAY) freeUsed += 1;
  else if (bonus > 0) {
    bonus -= 1;
    mode = 'credits';
  } else {
    return {
      ok: false,
      usage: { mode: 'supabase', left: 0, bonus: 0, proUntil: null, limit: FREE_PER_DAY }
    };
  }

  await sb('devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: deviceId,
      email: row && row.email ? row.email : null,
      bonus_credits: bonus,
      free_day: today,
      free_used: freeUsed,
      pro_until: row && row.pro_until ? row.pro_until : null
    }
  });

  return {
    ok: true,
    usage: {
      mode: mode,
      left: Math.max(0, FREE_PER_DAY - freeUsed) + bonus,
      bonus: bonus,
      proUntil: null,
      limit: FREE_PER_DAY
    }
  };
}

function consumeCookie(req) {
  var today = madridDay();
  var key = secret();
  var raw = readCookie(req, 'hg_free');
  var used = 0;
  if (raw) {
    var payload = verifyToken(raw, key);
    if (payload && payload.day === today) used = Number(payload.used) || 0;
  }
  if (used >= FREE_PER_DAY) {
    return {
      ok: false,
      usage: { mode: 'cookie', left: 0, proUntil: null, limit: FREE_PER_DAY }
    };
  }
  used += 1;
  var token = signToken({ app: 'hookgen-free', day: today, used: used }, key);
  return {
    ok: true,
    cookie: cookieHeader(req, 'hg_free', token),
    usage: { mode: 'cookie', left: FREE_PER_DAY - used, proUntil: null, limit: FREE_PER_DAY }
  };
}

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

function parseModelJson(text) {
  var clean = String(text || '').trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  var start = clean.indexOf('{');
  var end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('json');
  return JSON.parse(clean.slice(start, end + 1));
}

async function postChat(url, key, model, messages, jsonMode) {
  var body = {
    model: model,
    temperature: 0.9,
    max_tokens: 900,
    messages: messages
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: (data.error && data.error.message) || 'El modelo no ha respondido'
    };
  }
  var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return { ok: true, text: text || '' };
}

async function chat(url, key, model, messages) {
  var first = await postChat(url, key, model, messages, true);
  if (first.ok) return first.text;
  if (first.status === 400 || first.status === 422) {
    var second = await postChat(url, key, model, messages, false);
    if (second.ok) return second.text;
    throw new Error(second.message);
  }
  throw new Error(first.message);
}

async function completeHooks(input) {
  var messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: 'Tema: ' + input.topic + '\nPlataforma: ' + input.platform + '\nTono principal: ' + input.tone + '\nDevuelve 5 hooks variados.'
    }
  ];
  var text = null;
  var source = null;
  if (process.env.GROQ_API_KEY) {
    text = await chat(
      'https://api.groq.com/openai/v1/chat/completions',
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages
    );
    source = 'groq';
  } else if (process.env.OPENAI_API_KEY) {
    text = await chat(
      'https://api.openai.com/v1/chat/completions',
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages
    );
    source = 'openai';
  } else {
    return null;
  }
  var parsed = parseModelJson(text);
  var hooks = (parsed.hooks || []).filter(function (item) {
    return item && String(item.hook || '').trim();
  }).map(function (item) {
    return {
      hook: clip(item.hook, 220),
      caption: clip(item.caption, 600),
      cta: clip(item.cta, 160),
      pattern: clip(item.pattern, 32)
    };
  }).slice(0, 5);
  if (hooks.length < 3) return null;
  return { hooks: hooks, source: source };
}

function publicOrigin(req) {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/$/, '');
  var proto = req.headers['x-forwarded-proto'] || 'https';
  var host = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}

async function grantCredits(session, item, email) {
  if (!supabaseOn()) {
    var err = new Error('Los créditos sueltos necesitan Supabase. Elige un pase de días.');
    err.status = 400;
    throw err;
  }
  var deviceId = session.metadata.device_id;
  var existing = await sb('payments?session_id=eq.' + encodeURIComponent(session.id) + '&select=session_id', { method: 'GET' });
  var deviceRows = await sb('devices?id=eq.' + encodeURIComponent(deviceId) + '&select=*', { method: 'GET' });
  var device = Array.isArray(deviceRows) && deviceRows[0] ? deviceRows[0] : null;
  if (Array.isArray(existing) && existing.length) {
    return {
      mode: 'credits',
      already: true,
      credits: item.credits,
      bonus: device ? Number(device.bonus_credits) || 0 : item.credits
    };
  }
  var bonus = (device ? Number(device.bonus_credits) || 0 : 0) + item.credits;
  await sb('devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: deviceId,
      email: email || (device && device.email) || null,
      bonus_credits: bonus,
      free_day: device && device.free_day ? device.free_day : null,
      free_used: device ? Number(device.free_used) || 0 : 0,
      pro_until: device && device.pro_until ? device.pro_until : null
    }
  });
  await sb('payments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      session_id: session.id,
      device_id: deviceId,
      email: email || null,
      sku: item.sku,
      credits: item.credits,
      amount_cents: item.amount
    }
  });
  return { mode: 'credits', credits: item.credits, bonus: bonus };
}

async function grantPass(session, item, email, currentToken, deviceId) {
  var piId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id);
  if (!piId) {
    var missing = new Error('Stripe todavía no ha creado el cobro');
    missing.status = 409;
    throw missing;
  }
  var pi = await stripeRequest('GET', '/v1/payment_intents/' + encodeURIComponent(piId));
  if (pi.metadata && pi.metadata.pass_applied === '1' && pi.metadata.pro_until) {
    var stored = Number(pi.metadata.pro_until);
    return finishPass(deviceId, email, stored);
  }

  var proUntil = 0;
  var searched = null;
  if (email) {
    try { searched = await searchPayments(email); }
    catch (err) { searched = null; }
  }
  if (searched) {
    var current = mapPayment(pi);
    current.days = item.days;
    var already = searched.find(function (itemRow) { return itemRow.id === pi.id; });
    if (already) already.days = item.days;
    else searched.push(current);
    proUntil = passExpiry(searched);
  } else {
    var old = currentToken && secret() ? verifyToken(currentToken, secret()) : null;
    var base = Math.max(Date.now(), pi.created * 1000);
    if (old && old.app === 'hookgen' && old.deviceId === deviceId && Number(old.proUntil) > base) {
      base = Number(old.proUntil);
    }
    proUntil = base + item.days * 86400000;
  }

  var params = new URLSearchParams();
  params.set('metadata[app]', 'hookgen');
  params.set('metadata[pass_applied]', '1');
  params.set('metadata[pro_until]', String(proUntil));
  params.set('metadata[email]', email || '');
  params.set('metadata[days]', String(item.days));
  params.set('metadata[device_id]', deviceId);
  params.set('metadata[sku]', item.sku);
  await stripeRequest('POST', '/v1/payment_intents/' + encodeURIComponent(pi.id), params);
  return finishPass(deviceId, email, proUntil);
}

function finishPass(deviceId, email, proUntil) {
  var key = secret();
  if (!key) {
    var err = new Error('Falta APP_SECRET o STRIPE_SECRET_KEY para firmar el pase');
    err.status = 500;
    throw err;
  }
  var token = signToken({
    app: 'hookgen',
    deviceId: deviceId,
    email: email || '',
    proUntil: proUntil
  }, key);
  return { mode: 'pro', token: token, proUntil: proUntil };
}

async function moveCredits(email, deviceId) {
  if (!supabaseOn() || !email) return null;
  var rows = await sb('devices?email=eq.' + encodeURIComponent(email) + '&select=*', { method: 'GET' });
  if (!Array.isArray(rows) || !rows.length) return { bonus: 0 };
  var bonus = rows.reduce(function (sum, row) {
    return sum + (Number(row.bonus_credits) || 0);
  }, 0);
  await Promise.all(rows.map(function (row) {
    if (row.id === deviceId) return Promise.resolve();
    return sb('devices?id=eq.' + encodeURIComponent(row.id), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { bonus_credits: 0 }
    });
  }));
  await sb('devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { id: deviceId, email: email, bonus_credits: bonus }
  });
  return { bonus: bonus };
}

module.exports = {
  FREE_PER_DAY: FREE_PER_DAY,
  CATALOG: CATALOG,
  PLATFORMS: PLATFORMS,
  TONES: TONES,
  sendJson: sendJson,
  readRaw: readRaw,
  readJson: readJson,
  secret: secret,
  signToken: signToken,
  verifyToken: verifyToken,
  cleanDevice: cleanDevice,
  cleanEmail: cleanEmail,
  madridDay: madridDay,
  verifyStripeSignature: verifyStripeSignature,
  passExpiry: passExpiry,
  stripeOn: stripeOn,
  supabaseOn: supabaseOn,
  stripeRequest: stripeRequest,
  readPro: readPro,
  consumeCredit: consumeCredit,
  completeHooks: completeHooks,
  publicOrigin: publicOrigin,
  grantCredits: grantCredits,
  grantPass: grantPass,
  searchPayments: searchPayments,
  mapPayment: mapPayment,
  moveCredits: moveCredits
};
