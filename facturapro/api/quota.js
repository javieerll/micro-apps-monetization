const lib = require('./_lib');

// Cada número de factura nuevo cuenta. Volver a bajar el mismo número no gasta otro hueco.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    lib.sendJson(res, 405, { error: 'Método no permitido' });
    return;
  }

  let body;
  try { body = await lib.readJson(req); }
  catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  const deviceId = lib.cleanDevice(req.headers['x-device-id'] || body.deviceId);
  const invoiceId = lib.cleanInvoiceId(body.invoiceId);
  if (!deviceId || !invoiceId) {
    lib.sendJson(res, 400, { error: 'Falta el número de factura o el navegador' });
    return;
  }

  try {
    const result = await lib.takeSlot(req, deviceId, invoiceId, lib.bearer(req) || body.token || '');
    if (!result.ok) {
      lib.sendJson(res, 402, {
        error: 'Este mes ya has usado las 3 facturas gratis',
        paywall: true,
        left: 0
      });
      return;
    }
    lib.sendJson(res, 200, {
      premium: Boolean(result.premium),
      left: result.left,
      mode: result.mode
    }, result.headers);
  } catch (err) {
    lib.sendJson(res, err.status || 500, { error: err.message || 'No se ha podido comprobar el límite' });
  }
};
