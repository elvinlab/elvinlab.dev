# Suscripción por correo

**Español** · [English](SUBSCRIPTION.en.md)

Guía de la suscripción por correo a las notas: qué es, cómo se ve para quien lee, cómo está hecha, qué datos guarda, cómo se envía una nota y qué hacer cuando algo falla. Los pasos exactos de configuración están en la [receta 6.14](CONFIGURATION.md#614-suscripción-por-correo-a-las-notas-nuevas-subscribe); la decisión de diseño, en el [ADR 0014](adr/0014-email-subscription-d1-list-resend-port.md).

## 1. Qué es y para quién

Quien lee deja su correo en la banda del footer y recibe las notas nuevas y, de vez en cuando, un aviso de alguno de mis proyectos. Es para quien prefiere el correo al RSS.

- **Doble opt-in:** al suscribirse no entra a la lista; primero debe confirmar desde un enlace que llega por correo.
- **Baja en una página:** cada correo trae el enlace a `/subscribe/unsubscribe/`, sin cuenta y sin preguntas.
- **Nada se envía solo:** publicar una nota no manda ningún correo. El envío es un paso manual del dueño (sección 6).

## 2. Cómo se ve para quien lee

1. **Formulario del footer.** Su código y Turnstile no se cargan con la página: el script entra al primer foco o al pasar el cursor, y Turnstile al primer foco.
2. **Correo de confirmación.** Llega con un enlace válido **48 horas**.
3. **Botón en `/subscribe/confirm/`.** El enlace abre una página con un botón; el botón es el que confirma, para que un escáner de correo que abre enlaces no confirme a nadie.
4. **Un correo por cada nota** nueva, en el idioma que eligió al suscribirse.
5. **Baja en `/subscribe/unsubscribe/`.** Mismo patrón: la página muestra un botón y el botón da de baja.

Dónde se muestra la banda: en el footer de todas las páginas cuando están encendidos `features.blog`, `features.subscribe` y hay clave pública de Turnstile. **No** aparece en `/me` (se imprime como CV) ni en las páginas `/subscribe/*`. Las páginas de confirmación y baja existen en español e inglés (`/en/subscribe/...`).

## 3. Arquitectura en un dibujo

```
 Footer (shared/subscribe/SubscribeBand.astro + form-client.ts)
        │  Action `subscribe.request`
        ▼
 features/subscribe/subscribe.ts   (dominio: validación, reglas, sin proveedores)
        │
        ├── SubscriberRepository ──► adaptador D1: tablas `subscribers`, `subscribe_quota`
        ├── SubscribeQuota       ──► adaptador D1 (tope diario de confirmaciones)
        ├── SubscriptionMailer   ──► adaptador Resend (confirmación y lotes de notas)
        ├── SubscribeVerifier    ──► Turnstile (acción `subscribe`)
        └── SubscribeLimiter     ──► SUBSCRIBE_RATE_LIMITER (Cloudflare)
```

| Pieza | Dónde vive |
| --- | --- |
| Dominio y puertos | `apps/web/src/features/subscribe/` (`subscribe.ts`, `ports.ts`, `config.ts`) |
| Adaptadores | `features/subscribe/adapters/` (`d1.ts`, `resend.ts`, `webcrypto.ts`) |
| Código del navegador (banda, formulario, Turnstile) | `apps/web/src/shared/subscribe/` |
| Correos (HTML y texto) | `features/subscribe/email-templates.ts` |
| Páginas de confirmación y baja, y el endpoint del dueño | `apps/web/src/subscribe-routes/`, registradas por `integrations/subscribe-routes.ts` solo con el flag encendido |
| Migración | `apps/web/migrations/0002_subscribers.sql` |

**Cambiar de proveedor de correo:** escribe otro adaptador que implemente `SubscriptionMailer` (`sendConfirmation` y `sendNote`) y cámbialo en el `runtime`. El dominio y el esquema de la base no cambian; los tests ya lo prueban con un mailer falso.

## 4. Datos y privacidad

**Qué se guarda** (tabla `subscribers`, ver `migrations/0002_subscribers.sql`):

| Columna | Contenido |
| --- | --- |
| `id` | Identificador aleatorio |
| `email` | Correo, sin espacios y en minúsculas (único) |
| `status` | `pending`, `confirmed` o `unsubscribed` |
| `locale` | `es` o `en`: idioma de la página donde se suscribió |
| `confirm_hash`, `confirm_expires`, `confirm_sent_at` | Huella SHA-256 del enlace de confirmación, su vencimiento y cuándo se envió |
| `last_note` | Slug de la última nota enviada a esa persona |
| `created_at`, `confirmed_at`, `unsubscribed_at` | Fechas de cada paso |

La tabla `subscribe_quota` solo cuenta correos de confirmación por día UTC; no tiene datos personales.

**Qué no se guarda:**

- **La IP.** Solo alimenta el limitador y Turnstile en el momento.
- **El token de confirmación en claro.** Solo se guarda su huella (hash) y se borra al usarlo.
- **Ningún token de baja.** El enlace de baja es `id.firma`, con la firma HMAC del `id` usando `SUBSCRIBE_TOKEN_SECRET`: no hay nada que guardar por persona.
- Los logs llevan nombres de etapa y códigos, nunca un correo ni un token.

**Retención:**

- Las filas `pending` con más de 7 días se borran. La limpieza ocurre en la siguiente suscripción (no hay tarea programada).
- Una dirección dada de baja queda como entrada de supresión (`unsubscribed`) hasta que se pida borrarla.

**Borrar una dirección a pedido.** La petición llega por `/contact`. El dueño, desde `apps/web` y con `wrangler login` hecho, ejecuta:

```bash
mise exec -- pnpm exec wrangler d1 execute SITE_DB --remote --command "DELETE FROM subscribers WHERE email = '<address>'"
```

Reemplaza `<address>` a mano por la dirección **en minúsculas** (así se guarda). La CLI no usa parámetros enlazados: el valor va dentro de la sentencia, por eso conviene copiar la dirección exacta y no incluir comillas simples. En el código, las consultas sí usan parámetros enlazados (`?`), nunca texto concatenado.

La página [`/privacy`](https://elvinlab.dev/privacy/) describe todo esto para quien se suscribe; su sección de suscripción aparece solo con el flag encendido.

## 5. Límites y protección contra abuso

Valores de `apps/web/src/features/subscribe/config.ts` y `wrangler.jsonc`:

| Protección | Valor |
| --- | --- |
| Turnstile | Acción `subscribe`; falla cerrado |
| Honeypot | Campo oculto que debe llegar vacío |
| Tiempo mínimo de llenado | 3 segundos |
| Limitador por IP | 3 por minuto (`SUBSCRIBE_RATE_LIMITER`) |
| Reenvío de confirmación | Una dirección `pending` no recibe otro correo antes de 10 minutos |
| Limpieza de `pending` | 7 días |
| Tope global de confirmaciones | 30 al día (UTC) en todo el sitio |
| Resend, plan gratuito | 100 correos al día y 3000 al mes, compartidos entre confirmaciones y notas |
| Notas por ejecución | Lo que quede de los 100 del día después de las confirmaciones |
| Lote por llamada a Resend | 100 |

**Cuando se alcanza el tope diario:** el formulario muestra un mensaje fijo («Hoy llegaron muchas solicitudes. Inténtalo de nuevo mañana.») para cualquier dirección. La comprobación va antes de mirar la lista, así que el mensaje no revela nada sobre ninguna dirección.

**Límites honestos:**

- Un buzón real y desechable sí puede suscribirse y confirmar.
- Un ataque distribuido (muchas IP) puede gastar las 30 confirmaciones del día. El efecto es que ese día nadie nuevo se suscribe; las notas no se ven afectadas porque la reserva de correos de nota sigue en pie.

## 6. Guía del dueño, día a día (el flujo manual)

El envío es **manual a propósito**: se decidió mantenerlo así mientras se observa el sistema. Publicar la nota, liberar y correr el comando son tres pasos separados y conscientes.

1. **Publica la nota** ([`NOTES.md`](NOTES.md)) y **libera** (receta 7 de [`CONFIGURATION.md`](CONFIGURATION.md#7-publicar-release-y-revertir)). El endpoint solo ve notas ya publicadas en producción.
2. **Simula** (no envía nada, solo cuenta):

   ```bash
   SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)" mise exec -- pnpm notify:note <slug>
   ```

3. **Envía** con la misma línea más `--send`:

   ```bash
   SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)" mise exec -- pnpm notify:note <slug> --send
   ```

4. **Lee los conteos.** La simulación dice cuántos destinatarios faltan y cuántos se enviarían hoy. El envío dice cuántos salieron y cuántos siguen esperando. Si `remaining` es mayor que 0, vuelve a correrlo al día siguiente: continúa donde quedó, porque `last_note` marca a quién ya se le envió esa nota.

Reglas que conviene tener presentes:

- **Idioma:** una nota en español llega solo a suscriptores en español; una en inglés, solo a los de inglés.
- **Solo viaja el slug.** Título, resumen y enlace salen de la nota publicada, así que un token filtrado no permite poner texto propio frente a la lista.
- **Un borrador o un slug desconocido responde 404.** Libera primero la nota.
- **El token** vive en `~/.config/elvinlab/subscribe-admin-token` en la máquina del dueño y debe estar también en un gestor de contraseñas. El comando lo lee solo de la variable de entorno `SUBSCRIBE_ADMIN_TOKEN` (nunca como argumento) y no lo imprime. La URL del sitio debe ser `https`.
- **Rotarlo:** genera uno nuevo con `openssl rand -base64 48`, ejecuta `mise exec -- pnpm exec wrangler secret put SUBSCRIBE_ADMIN_TOKEN` (desde `apps/web`) y actualiza el archivo local y el gestor.

## 7. Configuración única (qué se hizo y cómo repetirlo en un fork)

Los comandos exactos están en la [receta 6.14](CONFIGURATION.md#614-suscripción-por-correo-a-las-notas-nuevas-subscribe); aquí solo el mapa:

1. Aplicar la migración `0002_subscribers.sql` a la base D1 real.
2. Crear los secretos del Worker `SUBSCRIBE_FROM`, `SUBSCRIBE_TOKEN_SECRET` y `SUBSCRIBE_ADMIN_TOKEN`.
3. El limitador `SUBSCRIBE_RATE_LIMITER` ya está declarado en `wrangler.jsonc`.
4. Verificar el dominio de envío en Resend (SPF y DKIM).
5. Tener la clave pública de Turnstile (receta 6.6).
6. Encender `features.subscribe: true` y liberar.

**Para un fork:** el sitio es white-label. El flag sale **apagado** por defecto y nada del dueño está escrito en el código: nombre, URL y remitente llegan por configuración y secretos. Con el flag apagado, las páginas, el endpoint y la sección de privacidad no existen.

## 8. Los correos

- **HTML más texto plano**, con diseño de tablas, que es lo que los clientes de correo soportan.
- **Fuentes del sistema.** Los clientes no cargan fuentes web, así que no aparecen Space Grotesk ni Press Start 2P.
- **Claro por defecto, con una versión oscura** (`prefers-color-scheme: dark`) para los clientes que la respetan.
- **Logo** en `/email/logo.png`, servido desde el propio sitio.
- **Vista previa local sin enviar nada:** `mise exec -- node --import ./apps/web/scripts/register-alias.mjs apps/web/scripts/preview-email.ts` escribe los HTML y textos con datos de ejemplo en la carpeta `.email-preview/` (ignorada por git). Detalle en [`TESTING.md`](TESTING.md#email-previews).
- **Revisa en clientes reales** con una dirección tuya de prueba: Gmail ignora el modo oscuro y cada cliente se ve distinto.

## 9. Cómo se verificó y cómo probarlo tú

- **Tests unitarios con fakes** (`features/subscribe/*.test.ts`, `shared/subscribe/*.test.ts`): reglas del dominio, adaptadores, plantillas y el comando del dueño. El test del adaptador D1 aplica la migración real sobre SQLite en memoria.
- **Test e2e** `tests/browser/subscribe.spec.ts`: la banda, la carga diferida, los estados de error, las páginas de confirmación y baja, y accesibilidad con axe en tema claro y oscuro.
- **Prueba de punta a punta a mano**, con una dirección que sea tuya: suscríbete desde el footer, abre el correo y confirma, envíate una nota con el comando de la sección 6 (simula y luego `--send`) y date de baja desde ese correo.
- **Nunca pruebes con la dirección de otra persona.**

## 10. Problemas comunes

| Síntoma | Causa probable | Qué revisar |
| --- | --- | --- |
| El formulario dice «no está disponible» | Falta un secreto o un binding | Los logs de Cloudflare (solo traen nombres): `SUBSCRIBE_FROM`, `SUBSCRIBE_TOKEN_SECRET`, `SITE_DB`, `SUBSCRIBE_RATE_LIMITER`, secretos de Resend y Turnstile |
| «Hoy llegaron muchas solicitudes» | Se alcanzó el tope de 30 confirmaciones del día | Esperar al día UTC siguiente |
| No llega el correo de confirmación | Dominio de Resend sin verificar o `SUBSCRIBE_FROM` mal | Panel de Resend y el secreto; revisa también spam |
| El endpoint o el comando responde 401 | Token equivocado | Que la variable coincida con el secreto del Worker |
| 429 | Limitador (3 por minuto) | Espera un minuto |
| 503 en el endpoint | Falta `SUBSCRIBE_ADMIN_TOKEN` en el Worker, o falla un binding | `wrangler secret list` y los logs. Con el flag apagado la ruta no existe (404) |
| 404 al enviar | Borrador o slug no publicado | Libera la nota y revisa el slug |
| La nota no llegó a nadie | Todos tienen ya `last_note` con ese slug, o el idioma no coincide | La simulación: `recipients` cuenta solo quien falta, del mismo idioma |
| 502 | Resend rechazó un lote | Nada se marcó como enviado en ese lote: vuelve a correr el comando |

## 11. Decisiones y dónde están

- [ADR 0014](adr/0014-email-subscription-d1-list-resend-port.md): lista en D1, proveedor de correo detrás de un puerto, lista propia con la API por lotes en lugar de las difusiones de Resend, POST de un clic descartado por `checkOrigin`, tope global de confirmaciones y disparador del dueño.
- [`BRAND.md`](BRAND.md): fila «Banda de suscripción» (aspecto de la banda).
- [`odd/tasks/subscribe.md`](../odd/tasks/subscribe.md): historial de la tarea y pasos del dueño.
