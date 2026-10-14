# StreakMaster

Mini app de Telegram para marcar hábitos cada día, mantener la racha y ganar monedas. Se puede abrir también en el navegador para probarla: ahí el anuncio es una simulación y las Stars no cobran.

La pantalla es un solo archivo, `index.html`. Los otros archivos existen para cobrar sin enseñar el token del bot.

## Qué hace

- Marca hábitos de hoy y guarda la racha en este teléfono.
- Si fallas un solo día y tienes un escudo, la racha sigue.
- Si fallas dos días, la racha vuelve a empezar.
- Las monedas salen de los hábitos, de las metas (7, 14, 21, 30, 66 y 100 días), de un anuncio o de un paquete de Stars.
- Las monedas se gastan en escudos y en temas.
- Tienes 8 segundos para pulsar **Deshacer** si marcas un hábito sin querer.

Las monedas viven en el dispositivo. Sirven para la tienda de la propia app. No las uses como premio canjeable por dinero: alguien con conocimientos puede editar la memoria del navegador. El cobro de Stars sí es real y lo confirma Telegram.

## Probar en este ordenador

1. Abre `index.html` en Chrome o Edge.
2. Marca un hábito. Deben sumarse monedas y la racha debe pasar a 1.
3. Recarga la página. Los datos siguen ahí.
4. Entra en Tienda y pulsa el anuncio de prueba. El texto deja claro que es una simulación.

El pago con Stars y el anuncio real solo funcionan con la app publicada y abierta desde Telegram.

## Publicar en Vercel (0 €)

1. Crea una cuenta gratis en [vercel.com](https://vercel.com) con GitHub.
2. Sube la carpeta `micro-apps` a un repositorio tuyo, o solo la carpeta `streakmaster`.
3. En Vercel: **Add New… → Project**. Importa el repositorio.
4. En **Root Directory** elige `streakmaster` si el repositorio contiene las tres apps.
5. No hace falta comando de build. Vercel detecta la carpeta `api`.
6. Pulsa **Deploy**.
7. Copia la URL. Será parecida a `https://streakmaster-tu-usuario.vercel.app`.

## Variables de entorno

En el proyecto de Vercel: **Settings → Environment Variables**. Crea estas tres. Los nombres van tal cual.

| Nombre | Valor |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | El token de @BotFather |
| `WEBAPP_URL` | La URL de Vercel, sin barra al final |
| `TELEGRAM_WEBHOOK_SECRET` | Una frase larga inventada por ti |

Vuelve a desplegar después de guardarlas (**Deployments → Redeploy**). Si no, el servidor sigue sin verlas.

Hay una plantilla en `.env.example`.

## Crear el bot

@BotFather escribe en inglés. Los comandos se mandan tal cual.

1. Abre Telegram y entra en `@BotFather`.
2. Envía `/newbot`. Pon un nombre visible, por ejemplo `StreakMaster`, y un usuario que acabe en `bot`.
3. Copia el token en `TELEGRAM_BOT_TOKEN`.
4. Envía `/newapp`. Elige el bot. Cuando pida la URL, pega `WEBAPP_URL`. La foto que pide puede ser una captura de la app, 640×360.
5. Registra el webhook. En PowerShell, con la URL ya desplegada:

```powershell
$token = "PEGA_EL_TOKEN"
$secreto = "LA_MISMA_FRASE_QUE_EN_VERCEL"
$url = "https://TU-PROYECTO.vercel.app/api/telegram"
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType "application/json" -Body (@{
  url = $url
  secret_token = $secreto
  allowed_updates = @("message", "pre_checkout_query")
} | ConvertTo-Json)
```

6. Abre tu bot, envía `/start` y pulsa **Abrir StreakMaster**.

Si más adelante cambias la URL, repite el paso del webhook y vuelve a guardar `WEBAPP_URL`.

No actives en Vercel una cabecera `X-Frame-Options`. Telegram abre la mini app dentro de su propia ventana y esa cabecera la dejaría en blanco.

## Anuncios (Monetag)

1. Crea una cuenta de publisher en [Monetag](https://monetag.com/).
2. Da de alta la mini app y crea una zona **Rewarded Interstitial**.
3. Copia la URL del script y el número de zona que te enseña el panel.
4. Pégalos en `config.js` (`monetagScriptUrl` y `monetagZoneId`) y vuelve a desplegar.
5. Prueba el botón dentro de Telegram, con un usuario real. En el navegador de escritorio el anuncio no cuenta.

Las monedas solo se entregan si Monetag marca el visionado como `valued`. Cerrar antes no paga.

## Stars

Los precios están en `api/invoice.js`:

- Chispa: 100 monedas, 15 Stars
- Llama: 500 monedas, 59 Stars
- Hoguera: 1400 monedas, 129 Stars

Telegram no tiene un modo de tarjeta de prueba para Stars. La prueba real es comprarte el paquete barato. No cierres la app hasta ver las monedas.

Telegram se queda una comisión cuando retiras Stars. El neto cambia. Míralo en el panel del bot antes de dar por buenos los precios. La checklist de monetización está en `MONETIZACION.md`.
