// Crea el enlace de pago con Telegram Stars.
// El token del bot solo vive en el servidor. El HTML nunca lo ve.
//
// Precios en Stars (no en céntimos). Si cambias un paquete, el HTML
// enseña los mismos números al llamar a GET /api/invoice.

const crypto = require('crypto');

const PACKS = [
  { sku: 'chispa', title: '100 monedas', description: 'Paquete Chispa de StreakMaster', stars: 15, coins: 100 },
  { sku: 'llama', title: '500 monedas', description: 'Paquete Llama de StreakMaster', stars: 59, coins: 500 },
  { sku: 'hoguera', title: '1400 monedas', description: 'Paquete Hoguera de StreakMaster', stars: 129, coins: 1400 }
];

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string' && req.body.trim()) {
      try { return resolve(JSON.parse(req.body)); }
      catch (err) { return reject(err); }
    }
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

// initData viene firmado por Telegram. Sin esta comprobación cualquiera
// podría pedirnos facturas a nombre de otro usuario.
function validInitData(initData, botToken) {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || (Date.now() / 1000) - authDate > 86400) return false;
  params.delete('hash');
  const check = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(check).digest('hex');
  const left = Buffer.from(calc, 'utf8');
  const right = Buffer.from(String(hash), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function userIdFrom(initData) {
  try {
    const user = JSON.parse(new URLSearchParams(initData).get('user') || '{}');
    return user.id ? String(user.id) : '0';
  } catch (err) {
    return '0';
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    send(res, 200, {
      packs: PACKS.map(({ sku, title, stars, coins }) => ({ sku, title, stars, coins }))
    });
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Método no permitido' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    send(res, 500, { error: 'Falta TELEGRAM_BOT_TOKEN en el servidor' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    send(res, 400, { error: 'El envío no es un JSON válido' });
    return;
  }

  const pack = PACKS.find((item) => item.sku === body.sku);
  if (!pack) {
    send(res, 400, { error: 'Ese paquete no existe' });
    return;
  }

  if (!validInitData(body.initData, token)) {
    send(res, 401, { error: 'Abre StreakMaster desde Telegram para pagar con Stars' });
    return;
  }

  // Telegram admite como máximo 128 bytes en el payload.
  const payload = [pack.sku, userIdFrom(body.initData), Date.now()].join(':').slice(0, 128);

  try {
    const tgRes = await fetch('https://api.telegram.org/bot' + token + '/createInvoiceLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: pack.title,
        description: pack.description,
        payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: pack.title, amount: pack.stars }]
      })
    });
    const data = await tgRes.json();
    if (!data.ok) {
      send(res, 502, { error: data.description || 'Telegram no ha creado el cobro' });
      return;
    }
    send(res, 200, { url: data.result, payload, coins: pack.coins, sku: pack.sku });
  } catch (err) {
    send(res, 502, { error: 'No se ha podido contactar con Telegram' });
  }
};
