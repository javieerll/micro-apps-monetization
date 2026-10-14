# HookGen

Genera 5 primeras frases para un vídeo corto. Hay 3 al día sin pagar. El pase de 7 días (2,99 €) o el de 30 (6,99 €) quita ese tope mientras dure.

Si no configuras ninguna clave, la app responde con textos de reserva. Sirve para enseñarla. Para venderla de verdad, conecta Groq (tiene capa gratuita) y Stripe.

## Probar en este ordenador

Abre `index.html`. Escribe un tema y genera. Esas pruebas no pasan por el servidor: el contador está en el navegador.

Para probar el servidor hace falta publicarla o usar Vercel en local.

## Publicar en Vercel (0 €)

1. Cuenta gratis en [vercel.com](https://vercel.com).
2. Sube el repositorio. En **Root Directory** elige `hookgen`.
3. No pongas comando de build.
4. **Deploy**.

## Variables

En **Settings → Environment Variables**. Los nombres exactos están en `.env.example`.

Mínimo para cobrar y para que el límite no sea solo del navegador:

| Nombre | Para qué |
| --- | --- |
| `APP_SECRET` | Una frase larga tuya. Firma el pase y el contador diario. |
| `GROQ_API_KEY` | La redacción con IA. Si falta, se usan los textos de reserva. |
| `STRIPE_SECRET_KEY` | Empieza por `sk_test_` mientras pruebas. |
| `STRIPE_WEBHOOK_SECRET` | Solo hace falta si vendes el paquete de 50 créditos. |
| `PUBLIC_URL` | La URL de Vercel, sin barra final. Si la omites, se intenta adivinar. |

Después de guardarlas, **Redeploy**.

La clave `service_role` de Supabase, si la usas, solo va en el servidor. Nunca en `config.js`.

## Stripe

1. Crea una cuenta en [stripe.com](https://stripe.com). Déjala en modo de prueba.
2. Desarrolladores → Claves de API → copia la clave secreta de prueba.
3. Para el paquete de créditos: Desarrolladores → Webhooks → añadir endpoint `https://TU-PROYECTO.vercel.app/api/webhook`. Evento: `checkout.session.completed`. Copia el secreto de firma en `STRIPE_WEBHOOK_SECRET`.
4. Tarjeta de prueba: `4242 4242 4242 4242`, una fecha futura y cualquier CVC.
5. Paga el pase de 7 días, vuelve a la página y comprueba que arriba pone «Pro hasta…».

Cuando cobres a gente de verdad, cambia a las claves `sk_live_` y crea el webhook otra vez en el modo real.

El precio que hay en `api/_lib.js` es el que paga el cliente. Si tu gestoría te dice que tienes que repercutir IVA, sube ese importe para que el total ya lo lleve. HookGen no calcula impuestos.

## Supabase (solo el paquete de 50 créditos)

1. Proyecto gratis en [supabase.com](https://supabase.com).
2. SQL Editor → pega `supabase/schema.sql` → Run.
3. Settings → API. Copia la URL del proyecto y la clave `service_role` (no la anónima).
4. Vuelve a desplegar.

Sin Supabase, esconde mentalmente el paquete de 50 créditos: el botón explica que aún no está activo. Los pases de días no lo necesitan.

## Groq

1. Entra en la consola de Groq y crea una clave.
2. Pégala en `GROQ_API_KEY`.
3. Si el modelo responde que no existe, cambia `GROQ_MODEL` a `llama-3.1-8b-instant`.

En `config.js` pon tu email de contacto antes de anunciar la página. Sale al final, en Privacidad.

La checklist está en `MONETIZACION.md`.
