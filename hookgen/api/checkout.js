const lib = require('./_lib');

function packs() {
  return Object.keys(lib.CATALOG).map(function (sku) {
    var item = lib.CATALOG[sku];
    return {
      sku: item.sku,
      name: item.name,
      amount: item.amount,
      days: item.days,
      credits: item.credits
    };
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    lib.sendJson(res, 200, {
      freePerDay: lib.FREE_PER_DAY,
      creditsEnabled: lib.supabaseOn(),
      stripe: lib.stripeOn(),
      packs: packs()
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
  try {
    body = await lib.readJson(req);
  } catch (err) {
    lib.sendJson(res, 400, { error: 'El envío no es válido' });
    return;
  }

  if (body.acceptTerms !== true) {
    lib.sendJson(res, 400, {
      error: 'Marca la casilla de acceso inmediato. Sin eso no se abre el pago.'
    });
    return;
  }

  const item = lib.CATALOG[body.sku];
  const deviceId = lib.cleanDevice(body.deviceId);
  const email = lib.cleanEmail(body.email);
  if (!item) {
    lib.sendJson(res, 400, { error: 'Ese producto no existe' });
    return;
  }
  if (!deviceId) {
    lib.sendJson(res, 400, { error: 'No se ha podido identificar este navegador' });
    return;
  }
  if (body.email && !email) {
    lib.sendJson(res, 400, { error: 'El email no parece válido' });
    return;
  }
  if (item.credits && !lib.supabaseOn()) {
    lib.sendJson(res, 400, {
      error: 'Los créditos sueltos se activan al conectar Supabase. Mientras tanto elige el pase de 7 o de 30 días.'
    });
    return;
  }

  const origin = lib.publicOrigin(req);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', origin + '/?pago=ok&session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', origin + '/?pago=cancelado');
  params.set('client_reference_id', deviceId);
  params.set('metadata[app]', 'hookgen');
  params.set('metadata[sku]', item.sku);
  params.set('metadata[device_id]', deviceId);
  params.set('metadata[days]', String(item.days));
  params.set('metadata[credits]', String(item.credits));
  params.set('metadata[terms]', 'acceso-inmediato');
  if (email) {
    params.set('customer_email', email);
    params.set('metadata[email]', email);
  }
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(item.amount));
  params.set('line_items[0][price_data][product_data][name]', item.name);
  params.set('line_items[0][price_data][product_data][description]', 'Contenido digital. Acceso inmediato.');

  try {
    const session = await lib.stripeRequest('POST', '/v1/checkout/sessions', params, {
      'Idempotency-Key': deviceId + ':' + item.sku + ':' + new Date().toISOString().slice(0, 13)
    });
    lib.sendJson(res, 200, { url: session.url });
  } catch (err) {
    lib.sendJson(res, err.status || 502, { error: err.message || 'No se ha podido abrir Stripe' });
  }
};
