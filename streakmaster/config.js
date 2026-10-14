// Configuración pública de StreakMaster.
// El token del bot NO va aquí. Va en las variables de entorno de Vercel.
//
// Cuando tengas la zona en Monetag, pega la URL del script y el número de zona
// que te da el panel (Rewarded Interstitial). El dominio cambia en cada cuenta:
// cópialo, no lo inventes.

window.STREAK_CONFIG = {
  monetagScriptUrl: "",
  monetagZoneId: "",
  adReward: 40,
  maxAdsPerDay: 5,
  adCooldownMs: 60000
};
