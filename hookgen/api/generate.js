const lib = require('./_lib');
const templates = require('../lib/templates');

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

  const topic = String(body.topic || '').replace(/\s+/g, ' ').trim();
  if (topic.length < 3 || topic.length > 180) {
    lib.sendJson(res, 400, { error: 'Escribe el tema en una frase, entre 3 y 180 caracteres' });
    return;
  }

  const platform = lib.PLATFORMS.indexOf(body.platform) !== -1 ? body.platform : 'tiktok';
  const tone = lib.TONES.indexOf(body.tone) !== -1 ? body.tone : 'directo';
  const deviceId = lib.cleanDevice(req.headers['x-device-id'] || body.deviceId);
  const pro = lib.readPro(req, deviceId);

  let gate;
  try {
    gate = await lib.consumeCredit(req, deviceId, pro);
  } catch (err) {
    lib.sendJson(res, err.status || 500, { error: err.message || 'No se han podido comprobar los créditos' });
    return;
  }

  if (!gate.ok) {
    lib.sendJson(res, 402, {
      error: 'Has gastado las generaciones de hoy',
      paywall: true,
      usage: gate.usage
    }, gate.cookie ? { 'Set-Cookie': gate.cookie } : undefined);
    return;
  }

  let hooks = null;
  let source = 'plantilla';
  try {
    const ai = await lib.completeHooks({ topic: topic, platform: platform, tone: tone });
    if (ai && ai.hooks && ai.hooks.length >= 3) {
      hooks = ai.hooks;
      source = ai.source;
    }
  } catch (err) {
    hooks = null;
  }

  if (!hooks) {
    hooks = templates.generate({ topic: topic, platform: platform, tone: tone }).hooks;
    source = 'plantilla';
  }

  lib.sendJson(res, 200, {
    source: source,
    hooks: hooks,
    usage: gate.usage
  }, gate.cookie ? { 'Set-Cookie': gate.cookie } : undefined);
};
