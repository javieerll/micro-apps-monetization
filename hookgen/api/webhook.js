const lib = require('./_lib');

// Los pases de días se activan al volver del pago (api/confirm.js).
// Este webhook suma los créditos sueltos aunque la persona cierre la pestaña.
// Stripe tiene que poder leer el cuerpo sin modificar. Si no, la firma no cuadra.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    lib.sendJson(res, 200, { ok: true });
    return;
  }

  const key = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key) {
    lib.sendJson(res, 500, { error: 'Falta STRIPE_WEBHOOK_SECRET' });
    return;
  }

  let raw;
  try {
    raw = await lib.readRaw(req);
  } catch (err) {
    lib.sendJson(res, 400, {
      error: 'El servidor ha leído el cuerpo ya convertido y no puedo comprobar la firma.'
    });
    return;
  }

  if (!lib.verifyStripeSignature(raw, req.headers['stripe-signature'] || '', key)) {
    lib.sendJson(res, 400, { error: 'Firma no válida' });
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    lib.sendJson(res, 400, { error: 'JSON no válido' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data && event.data.object;
    const meta = (session && session.metadata) || {};
    const item = lib.CATALOG[meta.sku];
    if (session && meta.app === 'hookgen' && item && item.credits) {
      try {
        const email = (session.customer_details && session.customer_details.email) || meta.email || '';
        await lib.grantCredits(session, item, email);
      } catch (err) {
        lib.sendJson(res, 500, { error: 'No se han podido sumar los créditos' });
        return;
      }
    }
  }

  lib.sendJson(res, 200, { received: true });
};
