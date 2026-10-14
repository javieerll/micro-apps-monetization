// Webhook del bot.
// Tiene que responder a pre_checkout_query en menos de 10 segundos.
// Si no responde, Telegram anula el pago aunque el usuario tenga Stars.

const PACKS = { chispa: 100, llama: 500, hoguera: 1400 };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
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

async function tg(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 200, { ok: true });
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret && headerSecret !== secret) {
    send(res, 401, { error: 'Secreto del webhook incorrecto' });
    return;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    send(res, 500, { error: 'Falta TELEGRAM_BOT_TOKEN' });
    return;
  }

  let update;
  try {
    update = await readJson(req);
  } catch (err) {
    send(res, 200, { ok: true });
    return;
  }

  try {
    if (update.pre_checkout_query) {
      await tg('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      });
    }

    const msg = update.message;
    if (msg && typeof msg.text === 'string' && msg.text.startsWith('/start')) {
      const url = (process.env.WEBAPP_URL || '').replace(/\/$/, '');
      if (!url) {
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: 'Falta WEBAPP_URL en el servidor. Aún no puedo abrir la mini app.'
        });
      } else {
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: 'Tus hábitos, en una pantalla. Entra cada día y no rompas la racha.',
          reply_markup: {
            inline_keyboard: [[{ text: 'Abrir StreakMaster', web_app: { url: url } }]]
          }
        });
        // Botón fijo junto al campo de escribir. Sin chat_id cambia el botón por defecto del bot.
        await tg('setChatMenuButton', {
          menu_button: { type: 'web_app', text: 'Abrir', web_app: { url: url } }
        });
      }
    }

    if (msg && msg.successful_payment) {
      const payload = msg.successful_payment.invoice_payload || '';
      const sku = payload.split(':')[0];
      const coins = PACKS[sku] || 0;
      await tg('sendMessage', {
        chat_id: msg.chat.id,
        text: coins
          ? 'Pago recibido. Vuelve a la app: las ' + coins + ' monedas se suman al confirmarse el pago. No cierres Telegram hasta verlas.'
          : 'Pago recibido. Gracias.'
      });
    }
  } catch (err) {
    // Aunque falle el aviso, respondemos 200. Si no, Telegram reintenta el mismo update.
  }

  send(res, 200, { ok: true });
};
