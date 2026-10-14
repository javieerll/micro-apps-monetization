const lib = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    lib.sendJson(res, 200, {
      freePerMonth: lib.FREE_PER_MONTH,
      stripe: lib.stripeOn(),
      enforced: lib.supabaseOn() || Boolean(lib.secret()),
      product: lib.PRODUCT
    });
    return;
  }

  if (req.method !== 'POST') {
    lib.sendJson(res, 405, { error: 'Método no permitido' });
    return;
  }
  if (!lib.stripeOn()) {
    lib.sendJson(res, 500, { error: 'Falta STRIPE_SECRET_KEY en el servidor' });
    return;
  }

  let body;
  try { body = await lib.readJson(req); }
  catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  if (body.acceptTerms !== true) {
    lib.sendJson(res, 400, { error: 'Marca la casilla de acceso inmediato. Sin eso no se abre el pago.' });
    return;
  }

  const deviceId = lib.cleanDevice(body.deviceId);
  const email = lib.cleanEmail(body.email);
  if (!deviceId) {
    lib.sendJson(res, 400, { error: 'No se ha podido identificar este navegador' });
    return;
  }
  if (!email) {
    lib.sendJson(res, 400, { error: 'Escribe un email válido. Sirve para el recibo y para recuperar la compra.' });
    return;
  }

  const origin = lib.publicOrigin(req);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', origin + '/?pago=ok&session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', origin + '/?pago=cancelado');
  params.set('customer_email', email);
  params.set('client_reference_id', deviceId);
  params.set('metadata[app]', 'facturapro');
  params.set('metadata[sku]', lib.PRODUCT.sku);
  params.set('metadata[device_id]', deviceId);
  params.set('metadata[email]', email);
  params.set('metadata[terms]', 'acceso-inmediato');
  params.set('payment_intent_data[metadata][app]', 'facturapro');
  params.set('payment_intent_data[metadata][sku]', lib.PRODUCT.sku);
  params.set('payment_intent_data[metadata][device_id]', deviceId);
  params.set('payment_intent_data[metadata][email]', email);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(lib.PRODUCT.amount));
  params.set('line_items[0][price_data][product_data][name]', lib.PRODUCT.name);
  params.set('line_items[0][price_data][product_data][description]', 'Descargas de PDF sin el límite mensual. Acceso inmediato.');

  try {
    const session = await lib.stripeRequest('POST', '/v1/checkout/sessions', params, {
      'Idempotency-Key': 'fp:' + deviceId + ':' + new Date().toISOString().slice(0, 13)
    });
    lib.sendJson(res, 200, { url: session.url });
  } catch (err) {
    lib.sendJson(res, err.status || 502, { error: err.message || 'No se ha podido abrir Stripe' });
  }
};
