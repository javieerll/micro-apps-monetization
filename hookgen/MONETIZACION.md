# Checklist de monetización — HookGen

## Antes de cobrar a nadie

- [ ] Página desplegada en Vercel.
- [ ] `APP_SECRET` puesto. Sin eso, borrar los datos del sitio reinicia las 3 generaciones.
- [ ] `GROQ_API_KEY` puesta y una generación de prueba que no diga «textos de reserva».
- [ ] Stripe en modo prueba. Pase de 7 días pagado con la tarjeta `4242`.
- [ ] Al volver, el recuadro de arriba dice «Pro hasta…».
- [ ] Casilla de acceso inmediato visible antes de ir a Stripe.
- [ ] Email de contacto escrito en `config.js`.
- [ ] Has leído con calma el precio. 2,99 € y 6,99 € son el total que paga la gente. Si debes repercutir IVA, cámbialo en `CATALOG` dentro de `api/_lib.js` antes de pasar a las claves reales.

## Al pasar a dinero real

- [ ] Claves de Stripe sustituidas por las que empiezan por `sk_live_`.
- [ ] Webhook creado otra vez en el modo real, solo si vendes créditos sueltos.
- [ ] Una compra real tuya de 2,99 €, y la devolución hecha desde el panel si no quieres quedártela.
- [ ] Supabase conectado si quieres el paquete de 50 créditos. Si no, no lo anuncies.

## Cada semana

- [ ] Generaciones al día (la consola de Groq marca el consumo; la capa gratuita tiene techo).
- [ ] Cuántas personas llegan a la ventana de pago.
- [ ] Compras de 7 días frente a compras de 30. Si casi nadie pasa de 7, no subas el precio del corto: mejora el resultado.
- [ ] Quejas de «suena a robot». Si salen, baja la temperatura no hace falta: cambia ejemplos en el prompt de `api/_lib.js` con frases que sí te gusten.

## Orden que funciona con poco dinero

No pagues anuncios el primer día. Publica 10 vídeos usando tus propios hooks y enlaza la herramienta en el perfil. Mide si vuelve gente al día siguiente. Si no vuelve, el problema es el texto, no la pasarela.
