const lib = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    lib.sendJson(res, 405, { error: 'Método no permitido' });
    return;
  }

  let body;
  try {
    body = await lib.readJson(req);
  } catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  const sessionId = String(body.sessionId || '');
  const deviceId = lib.cleanDevice(body.deviceId);
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    lib.sendJson(res, 400, { error: 'La referencia del pago no es válida' });
    return;
  }
  if (!deviceId) {
    lib.sendJson(res, 400, { error: 'No se ha podido identificar este navegador' });
    return;
  }

  try {
    const session = await lib.stripeRequest('GET', '/v1/checkout/sessions/' + encodeURIComponent(sessionId));
    const meta = session.metadata || {};
    if (meta.app !== 'hookgen') {
      lib.sendJson(res, 400, { error: 'Este pago no es de HookGen' });
      return;
    }
    if (meta.device_id !== deviceId) {
      lib.sendJson(res, 403, { error: 'Este pago se hizo en otro navegador. Recupéralo con el email del recibo.' });
      return;
    }
    const item = lib.CATALOG[meta.sku];
    if (!item) {
      lib.sendJson(res, 400, { error: 'El producto de este pago ya no existe' });
      return;
    }
    if (session.payment_status !== 'paid') {
      lib.sendJson(res, 409, { error: 'El pago todavía no está confirmado' });
      return;
    }
    if (Number(session.amount_total) !== item.amount) {
      lib.sendJson(res, 400, { error: 'El importe pagado no coincide con el precio' });
      return;
    }
    const email = lib.cleanEmail((session.customer_details && session.customer_details.email) || meta.email || '');
    const result = item.credits
      ? await lib.grantCredits(session, item, email)
      : await lib.grantPass(session, item, email, body.proToken, deviceId);
    lib.sendJson(res, 200, result);
  } catch (err) {
    lib.sendJson(res, err.status || 502, { error: err.message || 'No se ha podido confirmar el pago' });
  }
};
