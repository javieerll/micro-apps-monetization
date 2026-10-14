const lib = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    lib.sendJson(res, 405, { error: 'Método no permitido' });
    return;
  }
  if (!lib.stripeOn() || !lib.secret()) {
    lib.sendJson(res, 500, { error: 'Falta Stripe o APP_SECRET en el servidor' });
    return;
  }

  let body;
  try { body = await lib.readJson(req); }
  catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  const email = lib.cleanEmail(body.email);
  const deviceId = lib.cleanDevice(body.deviceId);
  if (!email || !deviceId) {
    lib.sendJson(res, 400, { error: 'Escribe el email del pago' });
    return;
  }

  try {
    const query = "status:'succeeded' AND metadata['app']:'facturapro' AND metadata['email']:'" + email + "'";
    const found = await lib.stripeRequest('GET', '/v1/payment_intents/search?limit=5&query=' + encodeURIComponent(query));
    const paid = (found.data || []).some(function (item) {
      return Number(item.amount_received || item.amount) === lib.PRODUCT.amount;
    });
    if (!paid) {
      lib.sendJson(res, 404, { error: 'No hay un pago de FacturaPro con ese email' });
      return;
    }
    await lib.markPremium(deviceId, email);
    lib.sendJson(res, 200, { premium: true, token: lib.proTokenFor(deviceId, email) });
  } catch (err) {
    lib.sendJson(res, 502, { error: 'Stripe no ha dejado buscar el pago. Ábrelo en el mismo navegador donde pagaste.' });
  }
};
