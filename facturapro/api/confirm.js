const lib = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    lib.sendJson(res, 405, { error: 'Método no permitido' });
    return;
  }
  if (!lib.secret()) {
    lib.sendJson(res, 500, { error: 'Falta APP_SECRET o STRIPE_SECRET_KEY para activar la compra' });
    return;
  }

  let body;
  try { body = await lib.readJson(req); }
  catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  const sessionId = String(body.sessionId || '');
  const deviceId = lib.cleanDevice(body.deviceId);
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) || !deviceId) {
    lib.sendJson(res, 400, { error: 'No se ha podido leer el pago' });
    return;
  }

  try {
    const session = await lib.stripeRequest('GET', '/v1/checkout/sessions/' + encodeURIComponent(sessionId));
    const meta = session.metadata || {};
    if (meta.app !== 'facturapro' || meta.device_id !== deviceId) {
      lib.sendJson(res, 403, { error: 'Este pago es de otro navegador. Recupéralo con el email del recibo.' });
      return;
    }
    if (session.payment_status !== 'paid' || Number(session.amount_total) !== lib.PRODUCT.amount) {
      lib.sendJson(res, 409, { error: 'El pago todavía no está confirmado' });
      return;
    }
    const email = lib.cleanEmail((session.customer_details && session.customer_details.email) || meta.email || '');
    await lib.markPremium(deviceId, email);
    lib.sendJson(res, 200, {
      premium: true,
      token: lib.proTokenFor(deviceId, email)
    });
  } catch (err) {
    lib.sendJson(res, err.status || 502, { error: err.message || 'No se ha podido activar la compra' });
  }
};
