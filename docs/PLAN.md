# Proyecto: Blog + Portafolio elvinlab

Contexto para Claude Code. Este documento resume decisiones ya tomadas — no son sugerencias a validar, son el punto de partida.

## Visión

Es el primer proyecto de la marca **elvinlab** (elvinlab.dev, nickname "elvinlab" en GitHub, dominio en Porkbun). Combina dos cosas: sección "about me" que funciona como portafolio, y un blog donde se documenta el proceso de construir los demás proyectos de elvinlab (razonamiento de decisiones, no tutoriales genéricos).

No es solo un rediseño: es también el terreno donde nace y se prueba `packages/core`, la base de diseño compartida que van a usar los demás proyectos (guías de juegos clásicos de PC, emulador J2ME con logros).

## Por qué desde cero (y no editar el sitio actual)

El sitio actual (elvinlab.dev, Astro) sigue funcionando y no está mal — se reconstruye a propósito para adquirir el hábito de preguntar, componente por componente: **¿esto es del blog o es de la base compartida?** Ese hábito no se adquiere retrofitteando código viejo.

## Qué se reutiliza del sitio actual

- **Contenido:** bio, descripciones de experiencia y proyectos, textos bilingües.
- **Setup de i18n** (la lógica bilingüe, reimplementada dentro de `core`).

Se descarta: la capa visual completa y la arquitectura de componentes actual.

## Deuda a corregir de una vez (aprovechando el rebuild)

- Acentos faltantes en textos viejos del portafolio.
- "Más de 3 años de experiencia" está desactualizado — la línea de tiempo arranca en 2020 y trabaja en BUO desde 2022. Actualizar al número real.
- Imágenes de stock/terceros usadas como portada de proyectos (ej. Discovering Owls, Eli Recomienda) — reemplazar por capturas propias del proyecto real.

## Estructura: monorepo

```
apps/web/       → el blog/portafolio
packages/core/  → base de diseño compartida
```

Sin publicar a npm, sin versionado semántico, sin changelog. Es un paquete interno del monorepo: un cambio en `core` se ve al instante en `apps/web`, sin proceso de release.

**Regla de construcción: nace en el proyecto, se mueve a `core` cuando se repite.** No diseñar el core por adelantado imaginando qué se va a necesitar — eso ya se decidió que es el error a evitar.

## Qué va en `core` desde el día uno (y nada más, por ahora)

1. **Tokens de diseño** — colores, tipografía, escala de espaciado, radios, sombras. Como variables CSS. Definir esto ANTES de escribir el primer componente — es el único punto donde sí conviene decidir por adelantado, porque es la identidad visual.
2. **Sistema de temas dark/light** — sobre esas mismas variables CSS, sin lógica de negocio.
3. **Infraestructura de i18n.**

Todo lo demás (navbar, tarjetas, tipografía de componentes, comentarios visuales, etc.) nace dentro de `apps/web`. Se mueve a `core` solo el día que un segundo proyecto real (guías de PC o el emulador J2ME) también lo necesite.

## Regla dura para `core`: presentación, nunca persistencia

Ningún componente de `core` hace `fetch` a un endpoint. Recibe datos por props y emite eventos — así ningún proyecto que use `core` queda casado a un backend concreto.

Ejemplo aplicado: si algún día se comparte un componente de comentarios, en `core` va solo el hilo visual y la caja de texto. Guardar, moderar y notificar es responsabilidad del proyecto (o del futuro hub de identidad), nunca de `core`.

## Contenido del blog

Los primeros posts son el propio proceso de decisión de qué construir: por qué se descartó el descargador de YouTube a MP3, por qué los blogs de micronicho con afiliados ya no rentan, cómo se aterrizó el sistema de logros del emulador J2ME. Es razonamiento de decisiones documentado, no tutoriales paso a paso.

- **Cadencia sostenible:** cada dos semanas. Semanal no se sostiene.
- **Extensión:** preferir posts cortos (~500 palabras) sobre una decisión concreta, en vez de piezas largas que nunca se terminan.

## Meta / condición de éxito

**Sitio en producción en `elvinlab.dev`** (revisado el 2026-09-30; ver "Decisiones 2026-09-30"). Los posts se escriben después del lanzamiento.

> Histórico: el criterio original era "blog publicado con 3 posts en 6 semanas".

Señal de alerta: si se sigue puliendo `core`, los fondos o el tooling sin lanzar, o si pasan 4 semanas desde el lanzamiento sin un post publicado, es exactamente el riesgo que se identificó — quedarse atrapado en la arquitectura en vez de publicar.

## Qué viene después (no ahora, no es parte de este alcance)

- **Template del blog**, como subproducto: consume `core` como dependencia (nunca lo copia). Un solo template, no una colección. Sale de este mismo código una vez que ya demostró que funciona en producción.
- **Fin de semana de extracción**, después de publicar el blog: sacar `core` a su propio repo, con landing, documentación y el ritual completo de publicación (versionado, changelog, releases) que aquí adentro no aplica.
- **Plantilla comercial** (landing + blog en un solo producto): planificada el 2026-10-03, sin implementar. Ver "Decisiones 2026-10-03: plantilla comercial". Un paquete para agencias o freelancers sigue siendo alcance posterior.

## Explícitamente fuera de alcance aquí

- Sistema de comentarios con backend/moderación — es del futuro hub de identidad compartido, no de este proyecto.
- Librería de componentes publicada de forma independiente — se extrae después de probada, no se diseña de antemano.
- Cualquier feature de los otros proyectos de elvinlab (presencia de Spotify, emulador, directorio de herramientas).

## Stack — resuelto (ver [ADR 0001](adr/0001-astro-tailwind-pnpm-monorepo.md) y `apps/web`)

> Histórico: así estaba planteado antes de confirmarse. Astro + React solo en islas + Tailwind v4 quedó fijado y el monorepo ya existe.

El sitio actual está en Astro. Por consistencia con el resto de elvinlab (el sitio de guías de PC también usa Astro + React solo en islas interactivas + Tailwind, con Vue evitado a propósito como quiebre del stack de trabajo diario en BUO), lo lógico es mantener esa misma combinación — pero no quedó fijado explícitamente para este rebuild. Confirmar antes de generar el andamiaje del monorepo.

---

## Decisiones agregadas (2026-09-27)

- **Nombre del blog:** Lab Notes — *by an eternal junior*. Ver [`BRAND.md`](BRAND.md#blog).
- **Rutas:** `elvinlab.dev` es el portafolio (muestra los últimos 3 posts), `elvinlab.dev/notes` el blog, `elvinlab.dev/notes/<slug>` cada post y `elvinlab.dev/devlog` queda reservado para un devlog futuro. Ruta en lugar de subdominio por SEO y un solo deploy.
- **Nombre del repo:** `elvinlab.dev`. El repo es del sitio; `core` solo vive aquí hasta su extracción.
- **Nombre del paquete:** `@elvinlab/core` desde el día uno, aunque no se publique. Los imports de `apps/web` no cambian el día que `core` se extraiga a su propio repo; el nombre de producto del repo futuro se decide en la extracción.
- **Propósito de `core`:** que otras personas puedan crear un blog o una landing con este estilo.
- **Distribución:** por GitHub, no por el registro público de npm. Se decide el mecanismo en la extracción (ver preguntas abiertas).
- **Regla de temas:** los tokens de [`BRAND.md`](BRAND.md#tokens-de-diseño) son el tema por defecto `theme-elvinlab`, no constantes. Marca, colores y tipografías se reemplazan en un solo archivo. Los componentes solo leen variables semánticas (`var(--brand-primary)`, `var(--surface)`), nunca un hex directo. Se comparte el lenguaje visual; la identidad cambia.
- **Coherencia con GitHub:** el perfil de GitHub y este sitio consumen la misma base de marca. `packages/core/src/tokens/tokens.json` es la única fuente de verdad para los tokens (`tokens.css` se genera con `packages/core/scripts/build-tokens.ts`).

## Preguntas abiertas

- [x] ¿Los posts se escriben en un solo idioma o se traducen todos? → Resuelto: un idioma por nota (ver "Decisiones 2026-09-30").
- [x] Confirmar el stack → Resuelto: [ADR 0001](adr/0001-astro-tailwind-pnpm-monorepo.md).
- [ ] Confirmar la escala de espaciado propuesta en `BRAND.md`.
- [ ] Mecanismo de distribución por GitHub al extraer `core`: dependencia git con tags (`github:elvinlab/<repo>#v1.0.0`, sin autenticación en repos públicos), GitHub Packages (requiere token incluso para paquetes públicos) o repositorio plantilla ("Use this template") para el starter.
- [x] Evaluar arrancar con una sola app y una carpeta `src/core/` en lugar del monorepo completo → Resuelto: se construyó el monorepo (`apps/web` + `packages/core`, [ADR 0003](adr/0003-screaming-architecture-and-core-boundary.md)).

## Decisiones 2026-09-30

Revisión del plan hecha con el usuario. El detalle operativo (tareas, tiers, orden) vive en `odd/tasks/elvinlab-site.md`, sección "Plan revision 2026-09-30".

- **Criterio de éxito:** sitio en producción en `elvinlab.dev`, con el cutover DNS (T22) hecho. Los posts los escribe el usuario después del lanzamiento (#27–29 etiquetadas `post-launch`, sin milestone). Alarma: 4 semanas desde el lanzamiento sin un post.
- **Notas en español:** los posts son solo en español. `/notes` queda oculta (sin link, `noindex`, fuera del sitemap y del RSS) hasta el primer post. Se eliminan `/en/notes`, las píldoras de filtro ES/EN y `/en/rss.xml`; el "Notes" de la navegación en inglés apunta a `/notes/` con la etiqueta "(in Spanish)". Los campos `lang` y `translationOf` del schema no se tocan; todo post es `lang: es`.
- **Interfaz bilingüe:** el resto de la app (`/`, `/me`, `/contact`, `/privacy`) mantiene soporte completo ES/EN.
- **Congelamiento hasta el lanzamiento:** trabajo decorativo y de tooling (selector de fondos #41, shaders adicionales, gates de calidad nuevos, mirror `.astro`). Solo se toca si rompe CI o bloquea una tarea del lanzamiento. El backlog queda etiquetado `post-launch`, igual que T20 (Giscus, #24).
- **Ahorro de tokens:** cada tarea lleva un tier; Claude hace solo Tier 3 y revisa diffs con `git diff --stat`, `rg` y re-ejecutando checks; el tracker y el espejo de Engram se actualizan una vez por unidad de trabajo; las tareas humanas quedan separadas.
- **Sitio anterior:** solo `/` (ES) y `/en/` son indexables, sin sitemap, `robots.txt` ni feeds, y con las mismas URLs que el sitio nuevo. No hace falta un mapa de redirects; se verifica que `/index.html` redirija a `/` y `/en/index.html` a `/en/` en el Worker desplegado.
- **Gate de SEO antes del cutover:** páginas `/contact` y `/privacy` (ES/EN), redirect `www` → apex, `noindex` en staging y previews de PR mediante un flag de build, Search Console verificado con el sitemap enviado, `lastmod` real y páginas nuevas en el sitemap, `og:image` por defecto con `summary_large_image`, headers básicos (`nosniff`, `Referrer-Policy`, `Permissions-Policy`), auditoría de los links de la navegación (`/contact/` es hoy un 404) y comprobar que `_headers` y `_redirects` se aplican en el Worker desplegado. Después del cutover: HSTS, desde el dashboard de Cloudflare, tras ~1 semana de HTTPS estable y sin `preload`. Con el primer post: `image` y `author.url` en `BlogPosting`. Descartados por ahora: `BreadcrumbList` y CSP.
- **Privacidad:** página `/privacy` completa (ES/EN), con texto base tipo GDPR, responsable Elvin con contacto vía `/contact`, sin asesoría legal y con fecha de actualización. Cubre Cloudflare Web Analytics, el formulario de contacto (Resend, Turnstile, rate limiter por IP) y `localStorage`. No afirma "sin cookies" para Web Analytics hasta verificarlo en la documentación de Cloudflare. El texto de Giscus (T20) ya está implementado como sección condicional de `buildPrivacyContent`: aparece solo cuando la config tiene el bloque `giscus`, y se verificó contra la política de privacidad de giscus y el README (datos en GitHub Discussions, OAuth de GitHub, token cifrado en `localStorage`).
- **Adoptadas el 2026-09-30:** (Q20) T22 se separa en T22a/T30 (humano: agregar la zona a Cloudflare, importar y verificar registros DNS incluidos MX y TXT de Resend, registros de GitHub Pages en modo solo DNS, cambiar nameservers; el sitio viejo sigue funcionando) y T22b/#26 (cutover al Custom Domain del Worker y regla `www`); (Q21) Search Console como propiedad de Dominio verificada por TXT en DNS (T31, después de T30). Sigue sin respuesta dónde está hoy el DNS y si el dominio tiene correo; T30 debe revisar los MX antes de cambiar los nameservers.

## Decisiones 2026-10-03: plantilla comercial

Planificación hecha con el usuario; **solo decisiones, nada implementado**. Matiza el criterio de "evaluar mucho más adelante" de la sección "Qué viene después". El documento portátil completo está fuera del repo (`~/Downloads/commercial-template-plan.md`); el seguimiento vive en la sección "Status 2026-10-05" de `odd/tasks/elvinlab-site.md` y en el issue de seguimiento.

- **Producto:** una plantilla única de landing + blog en un **repo nuevo y privado** (es el producto que se vende). Consume `@elvinlab/core` como dependencia versionada, nunca copiada. El comprador activa o desactiva secciones; no compra productos separados.
- **Layout fijo:** la identidad y la configuración del cliente reemplazan la marca del autor. El editor del navegador cubre textos, imágenes, artículos, colores y toggles de secciones; **no** es un constructor de páginas libre.
- **`core`:** base interna multiproyecto, **público por ahora** para simplificar la distribución. Extraerlo y definir cómo se distribuye es trabajo habilitante (ver pregunta abierta de distribución).
- **Comprador:** no técnico o con nivel técnico básico. Instalación con una guía detallada paso a paso, sin asistente; instrucciones opcionales usables por IA, sin depender de ella.
- **Propiedad y costos:** dominio y hosting son del cliente. Solo Cloudflare en la v1. Sin suscripciones obligatorias (no garantiza costo cero de dominio, hosting o proveedores).
- **Oferta:** una compra por sitio. Incluye plantilla, documentación y apoyo de lanzamiento. El mantenimiento continuo es aparte; los defectos de la plantilla se corrigen. Personalización, configuración y despliegue pagados aparte, con el límite frente al apoyo incluido por definir. Sin SLA, duración de soporte, derecho a actualizaciones ni precio estándar acordados.
- **Piloto:** 3 clientes, cobro y entrega manuales. **USD 9.99 único** como precio promocional tentativo. Techo de planificación: 16 h por cliente, 48 h en total. Aceptación: los 3 publican y editan contenido por su cuenta desde el navegador; se registran bloqueos y horas. Valida usabilidad y entrega, no rentabilidad.
- **Estado real:** no hay editor en el navegador (verificado el 2026-10-03: `docs/NOTES.md:21–31` describe archivos locales + Git). Decap CMS es solo candidato de evaluación; Keystatic y Tina también se compararon. **Ningún CMS está elegido ni probado.** Mover los ajustes editables de TypeScript a datos validados por esquema es un requisito técnico propuesto, no hecho.
- **Fases propuestas:** (1) probar la edición en este sitio: autenticación desplegada, rechazo de no autorizados, guardar → build → deploy en el runtime de Cloudflare; (2) extraer `core` (empaquetado, licencia, distribución); (3) crear la plantilla privada sin contenido ni credenciales personales; (4) probar la instalación desde cuentas nuevas y resolver costos, términos, pago, entrega, actualizaciones y soporte; (5) piloto de 3 compradores.
- **Fuera de alcance:** constructor de páginas libre, varios proveedores de hosting, tienda automatizada, dependencia obligatoria de IA, paquete para agencias.
- **Requisito de configurabilidad (corregido 2026-10-05):** quien reciba este repo (otra persona, o un comprador de la plantilla) debe poder quedarse **solo con el blog o solo con el portafolio** mediante configuración y `core`, sin rehacer nada. **No** se pide dividir este sitio en dos apps ni desplegar por separado: el blog y `/me` de elvinlab.dev quedan como están. Hoy ya existen los flags `features.blog`, `features.me`, `features.credentials` y `features.experiments`, y el código los respeta en varios puntos (`MePage.astro:34`, `Home.astro:29`). Verificado el 2026-10-05 con dos builds de fixture: ambos compilan; con `me` apagado `/me/` queda `noindex` y fuera del sitemap; con `blog` apagado las rutas de notas, el RSS y el sitemap se seguían generando. **Corregido el 2026-10-05** (`odd/tasks/blog-feature-flag.md`): ahora `blog: false` no genera rutas de notas, RSS ni entradas en el sitemap; con `blog: true` la salida de producción es idéntica. Falta probar `credentials`/`experiments` apagados y los flags `home.*`. La auditoría de `shared/` (detalle en `odd/tasks/elvinlab-site.md`, "Audit 2026-10-05") sirve solo si más adelante se quiere subir piezas a `core`. Seguimiento: #77.
- **Abiertas:** nombre y ubicación del repo; prueba final de CMS y runtime; licencia y empaquetado de `core`; términos de uso de la plantilla; método de pago y entrega; política de actualizaciones; límite entre soporte incluido y servicio adicional; captación de los 3 clientes; precio estándar. No hay conclusiones legales.
- **Riesgo señalado (no es una decisión):** este trabajo puede desplazar el criterio de éxito (3 notas) y chocar con el congelamiento de "Decisiones 2026-09-30". Cuándo empezar la fase 1 lo decide el usuario.
