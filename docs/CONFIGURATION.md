# Guía de configuración y actualización

**Español** · [English](CONFIGURATION.en.md)

Esta guía responde, en un solo lugar, a dos preguntas: **dónde se configura cada cosa** y **cómo se actualiza todo** (contenido, ajustes, secretos, dependencias y despliegues). Las tablas de referencia se **generan desde el código** (`pnpm docs:config`) y un test falla si se desfasan, así que lo que ves aquí es lo que el sitio realmente valida.

- [1. El mapa: qué cambiar y dónde](#1-el-mapa-qué-cambiar-y-dónde)
- [2. Cómo está pensada la configuración](#2-cómo-está-pensada-la-configuración)
- [3. Referencia: `site.config.ts`](#3-referencia-siteconfigts)
- [4. Referencia: contenido (`src/content/`)](#4-referencia-contenido-srccontent)
- [5. Referencia: variables de entorno y secretos](#5-referencia-variables-de-entorno-y-secretos)
- [6. Cómo actualizar cada cosa (recetas)](#6-cómo-actualizar-cada-cosa-recetas)
- [7. Publicar (release) y revertir](#7-publicar-release-y-revertir)
- [8. Verificar que todo está bien](#8-verificar-que-todo-está-bien)
- [9. Problemas frecuentes](#9-problemas-frecuentes)
- [10. Usar este sitio como base para otra persona (white-label)](#10-usar-este-sitio-como-base-para-otra-persona-white-label)

Para escribir notas, mira la guía aparte: [Cómo crear una nota](NOTES.md).

## 1. El mapa: qué cambiar y dónde

| Quiero cambiar... | Dónde | Cómo se valida |
| --- | --- | --- |
| Nombre, bio, rol, enlaces, idiomas, funciones activas, comentarios, analítica, fechas legales | [`apps/web/src/site.config.ts`](../apps/web/src/site.config.ts) | Al compilar: un valor inválido rompe el build y lista todos los problemas |
| Notas (el blog) | `apps/web/src/content/notes/<slug>/index.mdx` (borradores en `drafts/`) | Esquema de la nota (ver [la guía de notas](NOTES.md)) |
| Experiencia, certificados, experimentos, changelog | `apps/web/src/content/*.json` | Un esquema por archivo (sección 4) |
| Colores, radios y tipografías del tema | `packages/core/src/tokens/tokens.json` | Se regenera con `pnpm --filter @elvinlab/core tokens` |
| Textos de la interfaz (ES/EN) | `apps/web/src/shared/i18n/index.ts` | El tipado exige las mismas claves en ambos idiomas |
| Texto de privacidad y de términos | `apps/web/src/features/privacy/content.ts` y `.../terms/content.ts` | Tests de contenido (sin correos, sin promesas no verificables) |
| Foto, favicon, imagen de compartir por defecto | `apps/web/public/` | Ver la receta 6.9 |
| Secretos del formulario de contacto | Cloudflare (Worker) y `.dev.vars` en local | Sección 5 |
| Cómo se compila y despliega | `.github/workflows/ci.yml`, `apps/web/wrangler.jsonc`, `apps/web/astro.config.ts` | El propio CI |
| Versiones de Node y pnpm | `.mise.toml` (y `packageManager` en `package.json`, que debe coincidir) | `mise install` |
| Presupuestos de calidad | `lighthouserc.json` y `apps/web/scripts/performance-budget.ts` | El CI falla si no se cumplen |

## 2. Cómo está pensada la configuración

Hay **cuatro lugares** y cada cosa vive en uno solo:

1. **`site.config.ts` — los ajustes del sitio.** Es el único archivo de ajustes: identidad, funciones, ids públicos de terceros y fechas legales. Está tipado y validado (`apps/web/src/shared/config/schema.ts`), y cada campo se describe en el propio esquema.
2. **`src/content/` — el contenido.** Listas que crecen (notas, experiencia, certificados, experimentos, changelog). No se meten en el archivo de ajustes a propósito: lo inflarían y mezclarían "cómo es el sitio" con "qué publica".
3. **Secretos — Cloudflare.** Claves de API y direcciones de correo **nunca** se escriben en el repositorio (es público). En producción son secretos del Worker; en local, el archivo `.dev.vars` (ignorado por git).
4. **Archivos de herramientas.** `astro.config.ts`, `wrangler.jsonc`, los workflows, `biome.json`, `.mise.toml`: las herramientas los leen en su sitio, por eso no se pueden mover a `site.config.ts`.

Dos reglas que evitan sorpresas:

- **Una variable de entorno puede sobrescribir un id público** (`PUBLIC_CF_ANALYTICS_TOKEN`, `PUBLIC_TURNSTILE_SITE_KEY`). Si está vacía, manda `site.config.ts`. Sirve sobre todo en local (sección 6.6).
- **Todo lo que el código lee del entorno está registrado** en [`apps/web/src/shared/config/env-vars.ts`](../apps/web/src/shared/config/env-vars.ts). Un test falla si el código lee una variable que no está ahí. Esa lista alimenta la tabla de la sección 5 y los archivos `.env.example` y `.dev.vars.example`.

## 3. Referencia: `site.config.ts`

Las descripciones vienen del esquema (`.describe()`), por eso están en inglés. «Required: no» significa opcional o con valor por defecto.

<!-- docs:start site-config -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | `URL` | yes |  | Canonical origin of the site (https). Used for canonical links, the sitemap and share images. |
| `title` | `string` | yes |  | Site name: browser tab suffix, Open Graph site name and footer. |
| `description` | `{ <locale>: string }` | yes |  | Default meta description per locale (shown in search results and link previews). |
| `locales` | `object` | yes |  | Languages of the site. |
| `locales.default` | `string` | yes |  | Default locale, served without a URL prefix (for example `es` at `/`). |
| `locales.supported` | `string[]` | yes |  | Every locale the UI is translated into; non-default ones live under `/<locale>/`. |
| `identity` | `object` | yes |  | Who the site is about. |
| `identity.name` | `string` | yes |  | Full name of the site owner. |
| `identity.handle` | `string` | yes |  | Short lowercase handle shown in the navbar and footer wordmark. |
| `identity.role` | `{ <locale>: string }` | yes |  | One-line professional headline per locale. |
| `identity.bio` | `{ <locale>: string }` | yes |  | Short bio per locale (also the description of the /me page). |
| `identity.location` | `string` | no |  | City or country shown on /me and share cards. |
| `identity.startedYear` | `integer (min 1970)` | yes |  | First year of professional work; years of experience are derived from it. |
| `identity.avatar` | `string` | no |  | File name of a profile photo placed in `apps/web/src/assets/` (for example `avatar.png`); it is optimized at build time. Omit to show initials. |
| `appearance` | `'minimal' \| 'full'` | no | `full` | Visual preset. `minimal` is the calm look (smaller type, fewer home sections); `full` is the original look. Defaults to `full` so a config written before the preset existed does not change. |
| `home` | `object` | no | `{}` | Show or hide each home section; a key you set wins over the `appearance` preset, a key you omit follows it. `minimal` hides `heroPills`, `labLog` and `pillars`; `full` shows everything. A hidden section renders nothing. |
| `home.heroPills` | `boolean` | no |  | The three keyword pills under the hero intro (desktop only). |
| `home.authorCard` | `boolean` | no |  | The sidebar author card: photo, name, bio and social buttons. |
| `home.hiringCard` | `boolean` | no |  | The sidebar "Hiring?" recruiter card: availability and links to /me and the CV. |
| `home.labLog` | `boolean` | no |  | The sidebar "Lab log" box: since when, cadence and languages. |
| `home.pillars` | `boolean` | no |  | The four pillars strip at the bottom of the home (desktop only). |
| `home.notebookIndex` | `boolean` | no |  | The notebook index: compact rows for the notes after the latest one. |
| `home.experiments` | `boolean` | no |  | The experiments section of the home. Also needs `features.experiments`: with that flag off it never shows. |
| `socials` | `object[]` | yes |  | Social profile links shown in the footer and used as `sameAs` in structured data. |
| `socials[].label` | `string` | yes |  | Link text and accessible name. |
| `socials[].url` | `URL` | yes |  | Profile URL (https only: an email address never belongs in public config). |
| `socials[].icon` | `string` | yes |  | Icon name (`github`, `linkedin`, ...). |
| `background` | `object` | no | `{"galaxy":true,"cursorWaves":false}` | Default animated banner background (each visitor can change it). All effects read the theme palette. |
| `background.galaxy` | `boolean` | yes |  | Nebula clouds and a twinkling star field. |
| `background.cursorWaves` | `boolean` | yes |  | Slow colour waves with a ripple that follows the pointer. |
| `recruiter` | `object` | yes |  | Recruiter card on the home page and /me. |
| `recruiter.available` | `boolean` | yes |  | Show or hide the whole availability line (not whether you are open to work). |
| `recruiter.openToWork` | `boolean` | no | `true` | Whether you are open to work: green status dot when true, the brand accent colour when false. |
| `recruiter.status` | `{ <locale>: string }` | yes |  | Availability text per locale. Parts separated by " · " show as a headline plus short tags on the home card (for example "Working at Buo · open to chat"); a single part is one tag (for example "Open to work"). |
| `recruiter.lookingFor` | `{ <locale>: string }` | yes |  | What you are looking for, per locale. |
| `recruiter.cvUrl` | `URL` | no |  | Link to a downloadable CV (https). Omit to hide the CV button. |
| `me` | `object` | yes |  | Singular /me profile data. Lists that grow (experience, certificates) live in `src/content/`. |
| `me.timezone` | `string` | yes |  | Display timezone, for example `UTC−6`. |
| `me.workMode` | `{ <locale>: string }` | yes |  | Work mode per locale (remote, hybrid, ...). |
| `me.intro` | `{ <locale>: string }` | yes |  | The "what I bring" intro paragraph per locale. |
| `me.facts` | `object[]` | yes |  | At-a-glance strip: value and label pairs (the design shows up to four). |
| `me.facts[].value` | `{ <locale>: string }` | yes |  | The highlighted value. |
| `me.facts[].label` | `{ <locale>: string }` | yes |  | What the value means. |
| `me.strengths` | `object[]` | yes |  | "What I bring" tiles. |
| `me.strengths[].icon` | `string` | yes |  | Icon name of the tile. |
| `me.strengths[].title` | `{ <locale>: string }` | yes |  | Tile title. |
| `me.strengths[].body` | `{ <locale>: string }` | yes |  | Tile text. |
| `me.stack` | `object[]` | yes |  | Tech stack groups. |
| `me.stack[].label` | `{ <locale>: string }` | yes |  | Group name (Languages, Frontend, ...). |
| `me.stack[].items` | `string[]` | yes |  | Tools in the group. |
| `features` | `object` | yes |  | Feature flags: off means the routes are not generated and the nav entry is hidden. |
| `features.blog` | `boolean` | yes |  | Lab Notes: the notes index, note pages, RSS and the nav entry. |
| `features.comments` | `boolean` | yes |  | Giscus comments on notes. Needs the `giscus` block below, otherwise nothing renders. |
| `features.contact` | `boolean` | yes |  | The /contact form and its nav entry. |
| `features.credentials` | `boolean` | yes |  | Certificates and degrees on /me. |
| `features.experiments` | `boolean` | yes |  | The experiments (projects) section and its pages. |
| `features.changelog` | `boolean` | yes |  | Visitor-facing /changelog page: off hides the footer link, marks it noindex and keeps it out of the sitemap. |
| `features.me` | `boolean` | yes |  | The /me recruiter page: off hides it from the nav, marks it noindex and keeps it out of the sitemap. |
| `features.readingMode` | `boolean` | yes |  | Reading mode on notes: off renders no toggle, loads no script or CSS and stores nothing in the browser. |
| `integrations` | `object` | no | `{}` | Public ids of third-party services. They ship in the HTML by design, so they live here and not in secrets. |
| `integrations.cloudflareAnalyticsToken` | `string` | no |  | Cloudflare Web Analytics beacon token (public). Omit to turn analytics off. Env `PUBLIC_CF_ANALYTICS_TOKEN` overrides it. |
| `integrations.turnstileSiteKey` | `string` | no |  | Cloudflare Turnstile public site key for the contact form, bound to the domain. Env `PUBLIC_TURNSTILE_SITE_KEY` overrides it (use a test key locally). |
| `legal` | `object` | yes |  | Dates shown at the bottom of the legal pages. |
| `legal.privacyUpdated` | `date (YYYY-MM-DD)` | yes |  | "Last updated" date of the privacy page. Bump it when its text changes. |
| `legal.termsUpdated` | `date (YYYY-MM-DD)` | yes |  | "Last updated" date of the terms page. Bump it when its text changes. |
| `giscus` | `object` | no |  | Giscus comments (GitHub Discussions). Optional: without it nothing renders even when `features.comments` is on. |
| `giscus.repo` | `string` | yes |  | Repository whose Discussions store the comments, as `owner/name`. |
| `giscus.repoId` | `string` | yes |  | Repository node id from https://giscus.app (starts with `R_`). |
| `giscus.category` | `string` | yes |  | Discussion category name (an Announcements-type category). |
| `giscus.categoryId` | `string` | yes |  | Category node id from https://giscus.app (starts with `DIC_`). |
| `notice` | `{ <locale>: string }` | no |  | Optional site-wide notice strip per locale (for example "under construction"). Remove the key to hide it. |
<!-- docs:end site-config -->

## 4. Referencia: contenido (`src/content/`)

Los cuatro archivos JSON son **objetos con una clave por entrada**; la clave es el identificador (en minúsculas y con guiones). El orden del archivo no importa: cada página ordena a su manera.

### Experiencia — `experience.json`

Aparece en la línea de tiempo de `/me`. Si omites `end`, es el puesto actual.

```json
{
  "mi-empresa": {
    "role": "Full Stack Developer",
    "company": "Mi empresa",
    "start": 2024,
    "summary": "Una línea honesta de lo que haces.",
    "tags": ["typescript", "cloudflare"]
  }
}
```

<!-- docs:start experience -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `role` | `string (max 80)` | yes |  | Job title (max 80 characters). |
| `company` | `string (max 80)` | yes |  | Company or client (max 80 characters). |
| `start` | `integer (min 1970)` | yes |  | Year the role started. |
| `end` | `integer (min 1970)` | no |  | Year the role ended. Omit for the current role (drawn with a solid dot). |
| `location` | `string (max 80)` | no |  | Where the role was based (max 80 characters). |
| `summary` | `string (max 280)` | yes |  | One truthful summary line, no bullets (max 280 characters). |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
<!-- docs:end experience -->

### Certificados y títulos — `credentials.json`

Se agrupan por año, el más nuevo primero. Solo se muestran si `features.credentials` está activa.

```json
{
  "universidad-nacional": {
    "title": "Ingeniería, Programación Informática",
    "issuer": "Universidad Nacional",
    "kind": "degree",
    "year": 2021
  }
}
```

<!-- docs:start credentials -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 120)` | yes |  | Name of the certificate or degree (max 120 characters). |
| `issuer` | `string (max 80)` | yes |  | Who issued it (max 80 characters). |
| `kind` | `'degree' \| 'certificate'` | yes |  | Whether it is a degree or a certificate. |
| `year` | `integer (min 1970)` | yes |  | Year obtained; certificates are grouped by year, newest first. |
| `month` | `integer (min 1, max 12)` | no |  | Optional month (1-12) to order items within a year. |
| `url` | `URL` | no |  | Verification link (https only). |
| `credentialId` | `string` | no |  | Credential id in kebab-case, if the issuer gives one. |
<!-- docs:end credentials -->

### Experimentos — `experiments.json`

Proyectos del portafolio. **Solo enlaza repositorios públicos**; para trabajo privado deja `url` fuera.

```json
{
  "agentic-dev-setup": {
    "title": "agentic-dev-setup",
    "description": "Multi-agent development environment.",
    "tags": ["ai-agents", "tooling"],
    "year": 2026,
    "url": "https://github.com/elvinlab/agentic-dev-setup",
    "featured": true
  }
}
```

<!-- docs:start experiments -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 80)` | yes |  | Project name (max 80 characters). |
| `description` | `string (max 200)` | yes |  | What it is, in one or two sentences (max 200 characters). |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
| `year` | `integer (min 2000)` | yes |  | Year the project started or shipped. |
| `status` | `'running' \| 'shipped'` | no | `shipped` | `running` shows a green dot; `shipped` a violet one. |
| `url` | `URL` | no |  | Public link (https only). Leave it out for private work: a private repository is never linked. |
| `featured` | `boolean` | no | `false` | Featured projects lead the home strip. |
<!-- docs:end experiments -->

### Changelog — `changelog.json`

La página pública `/changelog`. Una entrada por cambio que **un visitante notaría**, con fecha y categoría; escríbela en el idioma del archivo (inglés) y en palabras llanas.

```json
{
  "reading-mode": {
    "date": "2026-10-01",
    "category": "added",
    "title": "Reading mode for notes",
    "description": "A button on every note switches to a calm single column."
  }
}
```

<!-- docs:start changelog -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `date` | `date (YYYY-MM-DD)` | yes |  | Day the change shipped to production. |
| `category` | `'added' \| 'changed' \| 'fixed' \| 'removed' \| 'security' \| 'deprecated'` | yes |  | Keep-a-Changelog category. |
| `title` | `string (max 120)` | yes |  | What a visitor would notice, in plain words (max 120 characters). |
| `description` | `string (max 500)` | no |  | One or two sentences of detail (max 500 characters). |
<!-- docs:end changelog -->

## 5. Referencia: variables de entorno y secretos

Cuatro ámbitos: **build** (se leen al compilar), **Worker** (en producción, en tiempo de ejecución), **CI** (GitHub Actions) y **local** (solo herramientas). Los valores secretos nunca van en el repositorio.

<!-- docs:start env-vars -->
| Name | Where | Secret | Required | Description | Set it in |
| --- | --- | --- | --- | --- | --- |
| `SITE_INDEXABLE` | build | no | no | Exactly `true` on production builds lets search engines index the site. Anything else adds noindex (header, meta tag and robots.txt), so previews and local builds are never indexed. | CI deploy step (`.github/workflows/ci.yml`); leave unset locally |
| `PUBLIC_CF_ANALYTICS_TOKEN` | build | no | no | Overrides `integrations.cloudflareAnalyticsToken`. Public by design: the token ships in the HTML. Normally leave it unset and edit the config. | optional override: `.env` locally or a GitHub environment variable |
| `PUBLIC_TURNSTILE_SITE_KEY` | build | no | no | Overrides `integrations.turnstileSiteKey`. Use it locally: a production key is bound to the domain and fails on localhost, so put a Cloudflare test key here. | optional override: `.env` locally or a GitHub environment variable |
| `RESEND_API_KEY` | Worker (runtime) | yes | yes | Resend API key used to send the contact notification email. | Cloudflare Worker secret (`wrangler secret put`); `.dev.vars` locally |
| `CONTACT_FROM` | Worker (runtime) | yes | yes | Sender address of the notification email, on a domain verified in Resend. An address is never written in tracked files. | Cloudflare Worker secret; `.dev.vars` locally |
| `CONTACT_TO` | Worker (runtime) | yes | yes | Inbox that receives contact messages. Never written in tracked files; the site only exposes the /contact form. | Cloudflare Worker secret; `.dev.vars` locally |
| `TURNSTILE_SECRET_KEY` | Worker (runtime) | yes | yes | Cloudflare Turnstile secret key that verifies the anti-bot token server side. | Cloudflare Worker secret; `.dev.vars` locally (use the Cloudflare test secret) |
| `TURNSTILE_HOSTNAME` | Worker (runtime) | no | yes | Hostname Turnstile must report for a valid token (for example the production domain). It makes a token from another site invalid. | Cloudflare Worker variable; `.dev.vars` locally (`localhost`) |
| `CLOUDFLARE_API_TOKEN` | CI | yes | yes | Cloudflare API token with permission to deploy the Worker; used only by the deploy job. | GitHub environment secret (`production`) |
| `CLOUDFLARE_ACCOUNT_ID` | CI | no | yes | Cloudflare account id the deploy job targets. Not a secret, but not needed anywhere else. | GitHub repository variable |
| `DEV_CHECK_STRIP_DEPS` | local tooling | no | no | Set to `1` to run `pnpm check:dev-cold-start` as its own negative control: it removes the pre-optimized dependencies first and must then fail. | the shell, only when running that check |
| `FIXTURE_APPEARANCE` | local tooling | no | no | Set to `minimal` or `full` to build the browser-test fixture with that appearance preset instead of the one in `site.config.ts` (only the temporary copy changes). Any other value fails the run. | the shell, only when running `pnpm test:e2e` (for example to verify the `minimal` preset) |
<!-- docs:end env-vars -->

### Archivos de ejemplo

- [`apps/web/.dev.vars.example`](../apps/web/.dev.vars.example): variables del Worker para desarrollo local. Cópialo a `apps/web/.dev.vars` (ignorado por git).
- [`apps/web/.env.example`](../apps/web/.env.example): variables de build opcionales. Cópialo a `apps/web/.env` (ignorado por git) solo si necesitas un override.

Ambos se generan desde el registro; **no los edites a mano**. Contenido de `.dev.vars.example`:

<!-- docs:start dev-vars-example -->
```ini
# Local Worker variables for `pnpm --filter web dev`. Copy to `.dev.vars` (git-ignored) and fill in.
# Generated from ENV_VARS by `pnpm docs:config`: edit src/shared/config/env-vars.ts, not this file.
# Never commit real values; in production these are Cloudflare Worker secrets.

# Resend API key used to send the contact notification email.
RESEND_API_KEY=

# Sender address of the notification email, on a domain verified in Resend. An address is never written in tracked files.
CONTACT_FROM=

# Inbox that receives contact messages. Never written in tracked files; the site only exposes the /contact form.
CONTACT_TO=

# Cloudflare Turnstile secret key that verifies the anti-bot token server side.
TURNSTILE_SECRET_KEY=

# Hostname Turnstile must report for a valid token (for example the production domain). It makes a token from another site invalid.
TURNSTILE_HOSTNAME=
```
<!-- docs:end dev-vars-example -->

Para probar el formulario en local sin Cloudflare real, Turnstile ofrece [claves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/): la *site key* `1x00000000000000000000AA` (siempre aprueba) en `PUBLIC_TURNSTILE_SITE_KEY` y el secreto `1x0000000000000000000000000000000AA` (siempre aprueba) en `TURNSTILE_SECRET_KEY`, con `TURNSTILE_HOSTNAME=localhost`. Sin ellas el formulario falla cerrado y muestra el estado «no disponible».

## 6. Cómo actualizar cada cosa (recetas)

Después de **cualquier** cambio: `mise exec -- pnpm test && mise exec -- pnpm typecheck && mise exec -- pnpm lint` (sección 8 para la lista completa).

### 6.1 Identidad, bio y enlaces

Edita `identity`, `description`, `socials` y `me` en `site.config.ts`. Los textos «por idioma» necesitan **todos** los idiomas de `locales.supported`; si falta uno, el build lo dice. Las redes son solo `https://` (un correo nunca va en la config pública: el contacto pasa por `/contact`).

### 6.2 Activar o apagar funciones

Cada bandera de `features` apaga la función completa: no se genera la ruta, desaparece el enlace del menú y, si aplica, la página queda `noindex` y fuera del sitemap.

| Bandera | Qué controla | Notas |
| --- | --- | --- |
| `blog` | Índice de notas, notas y RSS | Sin notas publicadas, el menú oculta «Notas» y el feed |
| `comments` | Comentarios y reacciones (Giscus) | Necesita el bloque `giscus`; ver 6.5 |
| `contact` | Formulario `/contact` | Necesita los secretos del Worker; sin ellos falla cerrado |
| `credentials` | Certificados en `/me` | |
| `experiments` | Sección y páginas de experimentos | |
| `changelog` | Página `/changelog` y su enlace | |
| `me` | Página `/me` (portafolio) | |
| `readingMode` | Modo lectura en las notas | Apagada: no se envía botón, script, CSS ni se guarda nada en el navegador |

#### Apariencia y secciones de la portada

`appearance` elige el preset visual: `minimal` oculta en la portada los chips del hero (`heroPills`), la caja «Bitácora» (`labLog`) y la franja de pilares (`pillars`); `full` (el de este sitio desde 2026-10-02) es el aspecto original y lo muestra todo. Si omites `appearance`, vale `full`, así que una config escrita antes del preset no cambia.

**Escala tipográfica.** `appearance` también fija el tamaño del texto: queda en `<html data-appearance>` y `apps/web/src/styles/type-scale.css` define la escala una sola vez (variables `--type-*`), así que cambiarla en un fork es editar ese archivo. `minimal`: hero 32/44 px (móvil/`md`), títulos de sección 20, título de nota 30/40, tarjeta destacada 20/22, cuerpo y párrafo de intro 17. `full` conserva los tamaños originales (hero 36/60 px, secciones 24, título de nota 36/48, tarjeta destacada 30/36, cuerpo 18). El modo lectura tiene su propia escala y no cambia.

**Banners y notas.** El mismo preset baja la altura de los banners (en `minimal`: 240 px en las páginas, portada expandida entre 360 y 460 px), hace que todos los banners se fundan con la página mediante un degradado de 120 px y, en las notas, deja en la cabecera solo la fecha y el tiempo de lectura (el idioma y el autor pasan al pie) con un registro de decisión más compacto. `full` conserva las alturas y la cabecera originales. Esos valores viven en `apps/web/src/styles/calm-layout.css`.

`home` ajusta cada sección por separado y **siempre gana sobre el preset**: una clave que pones manda, una que omites sigue al preset. Claves: `heroPills`, `authorCard`, `hiringCard`, `labLog`, `pillars`, `notebookIndex` y `experiments` (esta además necesita `features.experiments`). Una sección apagada no renderiza nada (ni título ni hueco), y si se apagan las tres tarjetas de la barra lateral (`authorCard`, `hiringCard`, `labLog`) la columna lateral desaparece.

```ts
// Aspecto calmado, pero con la Bitácora visible y sin la tarjeta de contratación.
appearance: 'minimal',
home: { labLog: true, hiringCard: false },
```

### 6.3 Experiencia, certificados y experimentos

Añade una entrada al JSON correspondiente (sección 4) con una clave nueva. Para quitar una, bórrala. Compila (`pnpm --filter web build`) para validar: un campo inválido rompe el build con el nombre del campo.

### 6.4 Changelog

Añade una entrada **por cambio visible** al publicar un release (fecha de hoy, categoría correcta). No anuncies algo que aún no existe en producción.

### 6.5 Comentarios (Giscus)

1. En GitHub: *Settings → Features → Discussions* (activar) y, si quieres, usa la categoría *Announcements*.
2. Instala la app: <https://github.com/apps/giscus> (solo en el repositorio).
3. Copia `repo`, `repoId`, `category` y `categoryId` (los obtienes en <https://giscus.app>, o con `gh api graphql` leyendo `repository { id discussionCategories { nodes { id name } } }`) al bloque `giscus` de `site.config.ts` y deja `features.comments: true`.
4. Comprueba que la app está instalada: `curl "https://giscus.app/api/discussions?repo=OWNER/REPO&term=probe&category=CATEGORIA&strict=true&last=1"` responde `Discussion not found` si está bien y `giscus is not installed on this repository` si falta instalarla.

Para apagarlos: `features.comments: false` (o borra el bloque `giscus`). Cada nota usa su ruta como hilo, así que cada idioma tiene su propia conversación.

### 6.6 Analítica y Turnstile

Cambia `integrations.cloudflareAnalyticsToken` o `integrations.turnstileSiteKey` en `site.config.ts` (omitir la clave apaga la analítica). Son públicos por diseño: viajan en el HTML. En local, la *site key* de producción **no funciona** (está atada al dominio): usa la de prueba de la sección 5 mediante `PUBLIC_TURNSTILE_SITE_KEY` en `apps/web/.env`; la variable tiene prioridad sobre la config.

### 6.7 Formulario de contacto: poner y rotar secretos

Los secretos son `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `TURNSTILE_SECRET_KEY` y `TURNSTILE_HOSTNAME` (tabla de la sección 5).

- **Producción** — desde `apps/web`: `pnpm exec wrangler secret put NOMBRE` (te pide el valor). También se pueden gestionar en el panel de Cloudflare: *Workers & Pages → tu Worker → Settings → Variables and Secrets*. Al poner un secreto, Cloudflare despliega por sí mismo una versión nueva del Worker que ya lo incluye; no hace falta un release del sitio.
- **Rotar una clave**: crea la nueva en el proveedor (Resend o Turnstile), ponla con `wrangler secret put` y revoca la anterior.
- **Local** — copia `.dev.vars.example` a `.dev.vars`.
- Si falta o es inválida cualquier variable, el formulario **falla cerrado** (muestra «no disponible») y el Worker registra solo los **nombres** rechazados, nunca los valores. Míralo con `pnpm exec wrangler tail`.
- El límite de envíos (3 por minuto) está en `wrangler.jsonc` (`ratelimits`).

### 6.8 Páginas legales

El texto vive en `apps/web/src/features/privacy/content.ts` y `apps/web/src/features/terms/content.ts` (ES y EN; el responsable, el dominio y los enlaces salen de la config). Dos reglas del proyecto: **solo se afirma lo verificable** (si un proveedor no documenta algo, la página no lo promete) y no es asesoría legal. Cuando cambies un texto, sube la fecha correspondiente en `legal` de `site.config.ts`.

### 6.9 Colores, tipografía, foto e imágenes

- **Tema**: `packages/core/src/tokens/tokens.json` y luego `mise exec -- pnpm --filter @elvinlab/core tokens` (regenera `tokens.css`). Los componentes leen variables semánticas, nunca un color directo.
- **Foto de perfil**: pon el archivo en `apps/web/src/assets/` y escribe solo su nombre en `identity.avatar` (por ejemplo `avatar.png`; png, jpg, webp o avif). Se optimiza en el build (webp con dimensiones explícitas) y se usa en la home, en `/me` y en la tarjeta de `/me`. Si el archivo no existe, el build falla.
- **Favicon**: `apps/web/public/favicon.svg`.
- **Imagen por defecto al compartir**: `apps/web/public/og-image.png` (1200 × 630). Es un archivo estático con el nombre de la persona dibujado: **reemplázalo** si usas el sitio para otra persona. Las notas y `/me` generan su propia tarjeta al compilar.
- **Tipografías**: se autoalojan (Fontsource); nunca se cargan desde un CDN. La cara pixelada de display (Pixelify Sans) es el token de fuente `pixel` en `tokens.json`; un tema puede reemplazarla.

### 6.10 Textos de la interfaz y un idioma nuevo

Los textos de la interfaz están en `apps/web/src/shared/i18n/index.ts`. Añadir un tercer idioma implica: agregarlo a `locales.supported`, un diccionario completo en `i18n` y **un árbol de páginas propio** en `apps/web/src/pages/<idioma>/` (las páginas de cada idioma son explícitas hoy, no dinámicas), además del contenido traducido.

### 6.11 Actualizar dependencias y herramientas

- **Dependabot** abre cada semana PRs hacia `develop` (agrupa menores y parches; actualizaciones de GitHub Actions aparte). Revísalos, ejecuta la lista de la sección 8 y fusiona. `typescript` mayor está ignorado a propósito (`@astrojs/check` aún no lo soporta).
- Si pnpm propone excepciones de `minimumReleaseAgeExclude`, **no las aceptes**: fija una versión anterior.
- Tras actualizar `astro`, `preact` o sus integraciones, corre `pnpm check:dev-cold-start` (detecta páginas en blanco en `astro dev`; si falla, añade la dependencia que muestre el error a `vite.optimizeDeps.include` de `astro.config.ts`).
- **Node y pnpm**: cambia la versión en `.mise.toml` y el campo `packageManager` de `package.json` (deben coincidir), luego `mise install`.

### 6.12 Presupuestos de calidad

- Lighthouse móvil (≥ 95 en las cuatro categorías, LCP ≤ 2,5 s, CLS ≤ 0,1): `lighthouserc.json`.
- JavaScript por página (30 KiB gzip): `apps/web/scripts/performance-budget.ts`.
- Un presupuesto no se sube para «hacer pasar» un cambio: se arregla el cambio.

## 7. Publicar (release) y revertir

El flujo completo está decidido en los ADR [0011](adr/0011-ci-gate-once-at-main-pr-no-staging.md) y [0012](adr/0012-direct-push-to-main-no-pr-gate.md). En corto:

- **Día a día**: se trabaja en `develop` y se hace push libre; no corre ningún CI.
- **Release**: lo que está en `develop` pasa a `main`. Ese push es lo **único** que dispara el CI (`static`, `e2e` y `lighthouse` en paralelo → `checks` → `deploy`). El despliegue va directo a producción y se comprueba con `.github/scripts/smoke-check.sh`, con rollback automático si falla.

```bash
git fetch origin
git checkout main && git merge --ff-only develop && git push origin main
git checkout develop
```

Las reglas de `main` exigen **historial lineal** (sin merge commits). Si `main` y `develop` divergieron (por ejemplo, un PR integrado con *squash*), el fast-forward no es posible; publica un único commit con el árbol de `develop`:

```bash
git fetch origin
SHA=$(git commit-tree develop^{tree} -p origin/main -m "chore(release): resumen del release")
git checkout main && git reset --hard origin/main && git merge --ff-only "$SHA" && git push origin main
git checkout develop
```

**Después de publicar:**

1. Mira el run en GitHub Actions (`gh run list --branch main --limit 1`). Si un job falla, **no hay deploy** y producción sigue con la versión anterior.
2. Verifica en vivo: `curl -s https://TU-DOMINIO/version.txt` debe mostrar el commit nuevo, y abre las páginas que cambiaste.
3. Si compartiste enlaces nuevos, refresca las vistas previas cacheadas: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) y [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

**Revertir un release**: lo más simple es `git revert` del commit de release en `develop` y publicar otra vez (así el historial cuenta lo que pasó). Cloudflare además conserva versiones anteriores del Worker, que `pnpm exec wrangler rollback` (desde `apps/web`) permite restaurar mientras arreglas.

Producción tiene un solo entorno (sin staging ni previews por PR). Las variables de GitHub del entorno `production` ya no son necesarias para los ids públicos (están en `site.config.ts`); siguen haciendo falta `CLOUDFLARE_API_TOKEN` (secreto) y `CLOUDFLARE_ACCOUNT_ID`.

## 8. Verificar que todo está bien

```bash
mise exec -- pnpm install            # dependencias
mise exec -- pnpm test               # tests unitarios
mise exec -- pnpm typecheck          # tipos (Astro + TypeScript)
mise exec -- pnpm lint               # Biome (formato y lint)
mise exec -- pnpm depcruise          # fronteras de arquitectura
mise exec -- pnpm test:e2e           # navegador: smoke, a11y, tema, comentarios, modo lectura
mise exec -- pnpm test:white-label   # build con otra identidad: no se filtra nada tuyo
mise exec -- pnpm --filter web build # compilación de producción
mise exec -- pnpm check:js-budget    # ≤ 30 KiB de JS gzip por página
mise exec -- pnpm test:lighthouse    # puntajes móviles y Core Web Vitals
mise exec -- pnpm docs:config        # regenera las tablas de esta guía
mise exec -- pnpm check:dev-cold-start # primer arranque de astro dev sin páginas en blanco
```

La primera vez, para los tests de navegador: `mise exec -- pnpm exec playwright install chromium`.

## 9. Problemas frecuentes

| Síntoma | Causa probable y qué hacer |
| --- | --- |
| El build dice `Invalid site config` | `site.config.ts` rompe el esquema; el mensaje lista cada campo. Compáralo con la tabla de la sección 3 |
| Un test dice «docs out of sync» | Cambiaste un esquema o `env-vars.ts`: corre `pnpm docs:config` y haz commit |
| Un test dice «add .describe()» | Un campo nuevo del esquema no tiene descripción: añádela en el código |
| Primera visita en blanco en `astro dev` | Vite descubrió una dependencia tarde; corre `pnpm check:dev-cold-start` y añade lo que muestre a `optimizeDeps.include` |
| El formulario dice «no disponible» | Falta o es inválido algún secreto del Worker (el log nombra cuál); ver 6.7 |
| No aparecen los comentarios | Revisa `features.comments`, el bloque `giscus`, que Discussions esté activo y la app instalada (6.5) |
| El enlace compartido muestra la tarjeta vieja | Es la caché de la red social: refresca con su depurador (sección 7) |
| El sitio no se indexa | Solo las compilaciones de producción llevan `SITE_INDEXABLE=true`; su ausencia es intencional en las compilaciones locales |
| Un job del CI falla y no hay deploy | Es el diseño: el deploy exige que todo pase. Arregla y vuelve a publicar |

## 10. Usar este sitio como base para otra persona (white-label)

El sitio está pensado para que otra persona lo adopte **solo cambiando configuración y contenido**; el estilo (layout, movimiento, motivos) queda en el código.

1. Reemplaza `site.config.ts` (identidad, idiomas, funciones, ids de terceros, fechas legales).
2. Reemplaza el contenido de `apps/web/src/content/` (notas, experiencia, certificados, experimentos, changelog) y los archivos de `apps/web/public/` (foto, favicon, `og-image.png`).
3. Ajusta el tema en `packages/core/src/tokens/tokens.json` si quieres otra paleta.
4. Pon tus secretos de Cloudflare (sección 6.7) y tus variables de CI (sección 7).
5. Verifica: `pnpm test:white-label` construye el sitio con una identidad alternativa y **falla si se filtra una sola cadena del dueño original**.

Este proyecto aún no incluye un archivo de licencia; antes de que otra persona lo reutilice, define bajo qué licencia se comparte.
