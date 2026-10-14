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
  try {
    body = await lib.readJson(req);
  } catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  const email = lib.cleanEmail(body.email);
  const deviceId = lib.cleanDevice(body.deviceId);
  if (!email) {
    lib.sendJson(res, 400, { error: 'Escribe el email con el que pagaste' });
    return;
  }
  if (!deviceId) {
    lib.sendJson(res, 400, { error: 'No se ha podido identificar este navegador' });
    return;
  }

  try {
    const payments = await lib.searchPayments(email);
    const proUntil = lib.passExpiry(payments);
    const credits = await lib.moveCredits(email, deviceId);
    const passActive = proUntil > Date.now();
    const bonus = credits && Number(credits.bonus) > 0 ? Number(credits.bonus) : 0;
    if (!passActive && !bonus) {
      lib.sendJson(res, 404, { error: 'No hay un pase activo ni créditos con ese email' });
      return;
    }
    const token = passActive
      ? lib.signToken({ app: 'hookgen', deviceId: deviceId, email: email, proUntil: proUntil }, lib.secret())
      : null;
    lib.sendJson(res, 200, {
      token: token,
      proUntil: passActive ? proUntil : null,
      bonus: bonus
    });
  } catch (err) {
    lib.sendJson(res, 502, {
      error: 'Stripe no ha dejado buscar el pago. Ábrelo en el mismo navegador donde pagaste.'
    });
  }
};
