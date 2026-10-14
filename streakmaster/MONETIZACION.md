# Checklist de monetización — StreakMaster

Marca cada casilla en orden. Hasta que las cinco primeras estén hechas, la app no ingresa.

## Día 0 — publicar

- [ ] Proyecto desplegado en Vercel, plan Hobby (0 €).
- [ ] `TELEGRAM_BOT_TOKEN`, `WEBAPP_URL` y `TELEGRAM_WEBHOOK_SECRET` guardados y el proyecto redesplegado.
- [ ] Bot creado con `/newbot` y mini app creada con `/newapp`.
- [ ] Webhook registrado y `/start` abre la app.
- [ ] Probado en tu móvil: marcar un hábito, cerrar Telegram y volver. La racha sigue.

## Ingresos por anuncios

- [ ] Cuenta de publisher en Monetag.
- [ ] Zona Rewarded Interstitial de Telegram Mini App.
- [ ] URL del script y número de zona pegados en `config.js`.
- [ ] Anuncio visto dentro de Telegram y monedas recibidas solo al terminarlo.
- [ ] Límite diario revisado (`maxAdsPerDay` en `config.js`). 5 es un buen inicio. Si la gente se queja, bájalo. Si nadie los ve, el botón ya está en Hoy y en Tienda.

## Ingresos por Stars

- [ ] Compra de prueba del paquete de 15 Stars hecha por ti.
- [ ] El webhook responde: el bot escribe «Pago recibido» en el chat.
- [ ] Las monedas aparecen sin cerrar la mini app.
- [ ] Precios tocados solo en `api/invoice.js`. La tienda lee ese archivo.

## Cada semana

- [ ] Personas que abren el bot (lo ves en Telegram).
- [ ] De cada 10 que abren, cuántas marcan un hábito el segundo día.
- [ ] Anuncios vistos por persona y día.
- [ ] Compras de Stars, aunque sean pocas.
- [ ] No subas el precio hasta tener al menos 20 compras. Entonces prueba a dejar el paquete grande un poco más caro, no el barato.

## Lo que no hay que hacer al principio

- No pagues anuncios para traer usuarios. Primero consigue 30 personas de grupos de hábitos o de tu propia lista.
- No muevas las monedas a un servidor hasta que alguien te pida recuperarlas en otro teléfono. Hoy eso es un gasto y un lío que no ingresa.
- No prometas premios en euros a cambio de monedas.
