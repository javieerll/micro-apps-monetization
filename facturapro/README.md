# FacturaPro

Hace un PDF de factura con base, IVA y retención de IRPF. La vista previa es libre. La descarga está limitada a 3 números nuevos al mes. Volver a bajar el mismo número no gasta otro hueco.

Quitar el límite cuesta 9 €, un solo pago, en este navegador. Se puede recuperar en otro con el email del recibo.

No envía nada a Hacienda y no es un programa certificado para Verifactu. Sirve para entregar un PDF claro mientras no necesites ese certificado. El aviso está en la propia página y al pie del PDF.

## Probar en este ordenador

1. Abre `index.html` con conexión (el PDF usa una librería que se descarga al abrir la página).
2. Rellena tus datos, el cliente y un precio.
3. Mira la vista previa: base, IVA y total tienen que cuadrar.
4. Pulsa **Descargar PDF** y abre el archivo.

Sin servidor, el contador de 3 facturas vive en el navegador.

## Publicar en Vercel (0 €)

1. Cuenta gratis en [vercel.com](https://vercel.com).
2. Importa el repositorio y pon **Root Directory** en `facturapro`.
3. No hace falta comando de build.
4. **Deploy**.

## Variables

Están nombradas en `.env.example`.

| Nombre | Para qué |
| --- | --- |
| `APP_SECRET` | Frase larga tuya. Firma la compra y el contador mensual. |
| `PUBLIC_URL` | La URL de Vercel, sin barra final. |
| `STRIPE_SECRET_KEY` | Primero la de prueba, `sk_test_`. |

Supabase es opcional. Si lo conectas, borrar las cookies no reinicia las 3 facturas. Pega `supabase/schema.sql` en el SQL Editor y guarda la URL y la clave `service_role` (la del servidor, no la pública).

Después de guardar las variables, vuelve a desplegar.

En `config.js` escribe tu email de contacto.

## Stripe

1. Cuenta en [stripe.com](https://stripe.com), modo de prueba.
2. Copia la clave secreta de prueba.
3. Tarjeta `4242 4242 4242 4242`, fecha futura, cualquier CVC.
4. Paga los 9 € de prueba y comprueba que el recuadro pasa a decir «Ilimitado».

El precio está en `api/_lib.js`, en céntimos (`900` son 9,00 €). Ese es el total que paga el cliente. Si tienes que repercutir IVA, súbelo ahí para que el número ya lo incluya.

No hace falta un webhook: la compra se activa al volver a la página. Si cierran antes, el enlace «Ya pagué en otro navegador» la recupera con el email.

La checklist está en `MONETIZACION.md`.
