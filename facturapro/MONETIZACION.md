# Checklist de monetización — FacturaPro

## Antes de pasar el enlace

- [ ] El PDF de prueba se abre y se lee: emisor, cliente, base, IVA, total.
- [ ] Has comprobado una factura con IVA 21 % y otra con retención del 15 %. El total es base + IVA − retención.
- [ ] El aviso de Verifactu se ve sin buscarlo. No prometas que esto presenta impuestos.
- [ ] Página en Vercel con `APP_SECRET` y `STRIPE_SECRET_KEY` de prueba.
- [ ] Compra de prueba con la tarjeta `4242`. Al volver, pone «Ilimitado».
- [ ] Email de contacto en `config.js`.
- [ ] Precio revisado en `api/_lib.js`. 9,00 € es el total. Si debes llevar IVA, el importe de ahí ya tiene que incluirlo.
- [ ] Casilla de acceso inmediato marcada en una prueba, y el pago no se abre si no está marcada.

## Cuando cobres de verdad

- [ ] Cambia a la clave `sk_live_`.
- [ ] Hazte un cobro real de 9 € o pídeselo a una persona de confianza.
- [ ] Si quieres que el límite no se borre con las cookies, conecta Supabase con el `schema.sql`.

## Cada semana

- [ ] Cuántas personas descargan la primera factura.
- [ ] Cuántas llegan a la cuarta (ahí aparece el pago).
- [ ] Cuántas pagan.
- [ ] Si nadie paga tras 30 descargas, no bajes el precio el primer día: pregunta a dos autónomos si el PDF les vale para enviarlo. Si dicen que no, el problema es el documento, no Stripe.

## A quién enseñárselo primero

Autónomos que ahora hacen la factura en Word o en una hoja de cálculo. No hace falta anuncio de pago. Un mensaje directo con el enlace y el precio visible basta para saber si duele el problema.
