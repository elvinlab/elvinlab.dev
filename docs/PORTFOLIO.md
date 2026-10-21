# Guía del portafolio: perfil y experimentos

**Español** · [English](PORTFOLIO.en.md)

Guía de «quiero cambiar X: qué archivo, qué campo, un ejemplo» para lo que ve un reclutador o un visitante: la página `/me`, la página de experimentos y sus filas en `/me`. Las tablas de referencia de cada campo están generadas desde el código en [CONFIGURATION.md](CONFIGURATION.md) (`pnpm docs:config`); aquí van los pasos y los ejemplos para copiar.

- [1. Dónde vive cada cosa](#1-dónde-vive-cada-cosa)
- [2. Editar el perfil de `/me`](#2-editar-el-perfil-de-me)
- [3. Agregar o editar un experimento](#3-agregar-o-editar-un-experimento)
- [4. Paginación y niveles de la lista](#4-paginación-y-niveles-de-la-lista)
- [5. Experiencia laboral](#5-experiencia-laboral)
- [6. Certificados y formación](#6-certificados-y-formación)
- [7. Lista de verificación antes de publicar](#7-lista-de-verificación-antes-de-publicar)
- [8. Límites y errores](#8-límites-y-errores)

## 1. Dónde vive cada cosa

| Quiero cambiar... | Archivo | Campo o carpeta |
| --- | --- | --- |
| Nombre, rol, bio, ubicación, foto | [`apps/web/src/site.config.ts`](../apps/web/src/site.config.ts) | `identity` (`name`, `role`, `bio`, `location`, `avatar`, `photo`) |
| Titular, frase de presentación, datos de un vistazo, «qué aporto» | `site.config.ts` | `me.headline`, `me.pitch`, `me.intro`, `me.facts`, `me.strengths` |
| Disponibilidad y CV | `site.config.ts` | `recruiter.status`, `recruiter.lookingFor`, `recruiter.cvUrl` |
| Idiomas que hablo, zona horaria, modalidad | `site.config.ts` | `me.languages`, `me.timezone`, `me.workMode` |
| Stack (grupos de herramientas) | `site.config.ts` | `me.stack` |
| Experiencia laboral | `apps/web/src/content/experience.json` | una clave por puesto |
| Experimentos (proyectos) | `apps/web/src/content/experiments.json` | una clave por experimento |
| Imágenes de un experimento | `apps/web/src/assets/experiments/<clave>/` | archivos listados en `images` |
| Tamaño de página, destacados, filas en `/me`, intro y palabras de la página | `site.config.ts` | bloque `experiments` |
| Notas | `apps/web/src/content/notes/<slug>/index.mdx` | ver [NOTES.md](NOTES.md) |
| Certificados y títulos (`/education/` y el bloque de `/me`) | `apps/web/src/content/credentials.json` | una clave por certificado |
| Nombres de etiquetas de experimentos (`ai-agents` se muestra «AI agents») | `apps/web/src/features/portfolio/lib/experiments.ts` | `EXPERIMENT_TAG_LABELS` |
| Etiquetas genéricas de la interfaz (botones, estados, «Más experimentos», paginador) | `apps/web/src/shared/i18n/index.ts` | claves `experiments.*`, `exp.status.*`, `me.*` |

Regla: **la voz del dueño va en config o en contenido; las etiquetas genéricas de la interfaz, en el diccionario i18n.** Ningún componente tiene frases del dueño escritas dentro.

## 2. Editar el perfil de `/me`

Todo está en `site.config.ts`. Los textos son un objeto por idioma (el idioma por defecto es obligatorio):

```ts
me: {
  headline: { es: 'Del dato a la pantalla.', en: 'From data to screen.' },
  pitch: { es: 'Desarrollo interfaces, servicios y herramientas para productos web.', en: 'I build interfaces, backend services and tools for web products.' },
  languages: { es: 'Español nativo · Inglés B1', en: 'Spanish native · English B1' },
}
```

- **Disponibilidad:** `recruiter.status` es el rótulo corto («Colaboraciones y buena charla») y `recruiter.lookingFor` la línea de la barra lateral. `recruiter.available: false` oculta la línea entera.
- **CV:** `recruiter.cvUrl` acepta una URL (https) o una por idioma. Sin CV, el botón no aparece.
- **Stack:** cada grupo de `me.stack` lleva `label`, `items` y, opcionalmente, `icon`, `hint` (la frase del tooltip) y `layer`. Los grupos con `layer: true` se dibujan como capas numeradas del producto (por ejemplo datos, backend, frontend, cloud) unidas por una línea vertical; ponlos primero. Los grupos sin `layer` (IA, calidad, proyectos) cruzan las capas y van debajo; con `folded: true` quedan dentro de un bloque plegado "Más herramientas" (sin JavaScript) para que el stack sea corto. Para mantener `/me` rápido, evita añadir íconos o tooltips por cada herramienta.
- **Datos en bruto:** bajo el stack, `/me` muestra un bloque plegado (`<details>`, sin JavaScript) con los datos de la propia página como filas `campo / tipo / valor`. Se genera solo desde `identity` (nombre, handle, rol, ubicación, año de inicio), `me.headline` y `me.stack` en el idioma activo; no hay nada que configurar y no se muestra ninguna clave que no esté en esos campos.
- **Fotos:** `identity.avatar` y `identity.photo` son nombres de archivo dentro de `apps/web/src/assets/`.

## 3. Agregar o editar un experimento

1. **Elige la clave** (minúsculas con guiones, por ejemplo `mi-proyecto`): es el identificador, la URL de su case page (`/experiments/<clave>/`), el ancla en su página de experimentos generada y el nombre de la carpeta de imágenes. Las entradas mostradas en `/me` quedan en la página 1 (`/experiments/#mi-proyecto`); las demás pueden aparecer en páginas posteriores.
2. **Copia las imágenes** (solo capturas propias, 1280 x 800, 16:10) a `apps/web/src/assets/experiments/mi-proyecto/`. Nunca a `public/`: así se optimizan y un archivo que falta rompe el build. Política y razones: [DESIGN.md](DESIGN.md#images-of-experiments-and-credentials-policy-2026-10-06) y el [ADR 0015](adr/0015-images-live-in-the-repository.md).
3. **Agrega la entrada** en `apps/web/src/content/experiments.json` con esta plantilla (usa todos los campos; borra los que no necesites, solo `title`, `description` y `year` son obligatorios):

```json
{
  "mi-proyecto": {
    "title": "mi-proyecto",
    "subtitle": { "es": "Una línea corta bajo el título", "en": "A short line under the title" },
    "description": {
      "es": "Qué es, en una o dos frases.",
      "en": "What it is, in one or two sentences."
    },
    "problem": { "es": "El problema que resuelve.", "en": "The problem it solves." },
    "contribution": { "es": "Lo que hice yo, no las herramientas ni el equipo.", "en": "What I did myself, not tools or teammates." },
    "result": { "es": "Lo que entregó, sin cifras inventadas.", "en": "What it delivered, with no invented numbers." },
    "tags": ["astro", "typescript"],
    "year": 2026,
    "publishedAt": "2026-03-14",
    "status": "shipped",
    "url": "https://ejemplo.dev",
    "repo": "https://github.com/usuario/mi-proyecto",
    "note": "slug-de-una-nota-publicada",
    "images": [
      {
        "file": "cover.jpg",
        "alt": { "es": "Captura de la página de inicio", "en": "Screenshot of the home page" },
        "caption": { "es": "Inicio", "en": "Home" }
      },
      {
        "file": "detalle.jpg",
        "alt": { "es": "Captura del detalle", "en": "Screenshot of the detail view" }
      }
    ],
    "order": 10,
    "featured": false
  }
}
```

**Qué hace cada campo que importa**

- `images[]`: de 1 a 4, **en el orden en que se muestran**. La primera es la portada: la usan las filas de `/me`, la tarjeta compacta y la primera diapositiva. `alt` es obligatorio (hasta 140 caracteres); `caption` es opcional (hasta 120) y se ve bajo la imagen. Con una imagen es una figura; con dos o más, una galería con miniaturas que funciona sin JavaScript; sin `images`, una portada tipográfica (nunca una captura falsa).
- `featured: true`: el experimento es una **pieza grande** (galería, tres datos, acciones). Máximo `experiments.maxFeatured` (3 por defecto). Si ninguno es destacado, el primero según el orden es la pieza grande.
- **Número de entrada:** cada pieza grande abre con «Experimento 001», como «Nota 003» en las notas. El número es estable: la posición del experimento por fecha de publicación (`publishedAt`, o 1 de enero de su `year`) entre TODOS los experimentos, de más antiguo (001) a más nuevo, con el `id` como desempate. No cambia con el orden elegido ni con la página, y no se escribe a mano. Un experimento nuevo recibe el número siguiente solo si es el más reciente; uno con fecha anterior desplaza a los posteriores.
- `order`: posición dentro del mismo nivel (menor primero, 100 por defecto) y desempate de los órdenes. Los destacados siempre van antes. `publishedAt` (opcional, `AAAA-MM-DD`) fija la fecha exacta para ordenar por fecha; sin él se usa el 1 de enero de `year`.
- `status`: `running` (punto verde, «En curso»), `shipped` (violeta, «Publicado») o `archived` (gris, «Archivado»).
- `note`: slug de una nota **publicada**; añade la tarjeta «La nota donde hablo de esto» al final de la case page (enlaza a la nota) y, en la lista, el botón «Leer el caso» va a la case page. El build falla si la nota no existe.
- `url` y `repo`: solo https; nunca un repositorio privado. Para trabajo privado, déjalos fuera.
- `tags`: hasta 5 en kebab-case; las piezas muestran 3 y las tarjetas compactas 2. Para un nombre bonito (`ai-agents` → «AI agents») agrega la etiqueta en `EXPERIMENT_TAG_LABELS`; si no está, se muestra tal cual.

**Errores de validación que verás (rompen el build y nombran el campo)**

- `N experiments are featured (a, b, c, d), but at most 3 may be ...`: hay más destacados que `experiments.maxFeatured`; pon `featured: false` en los demás o sube el límite.
- `Experiment "x" points to note "y", which is not published`: la nota no existe o sigue en borradores.
- `experiment "x" points to an image src/assets/experiments/x/f.jpg, which does not exist`: el archivo no está en la carpeta de la entrada.
- Un campo fuera de rango (texto demasiado largo, URL no https, más de 4 imágenes): el mensaje de Zod indica la ruta exacta.

### La tarjeta del último experimento

Con `features.experimentNudge` encendido, el sitio lleva a los visitantes a tu experimento más nuevo (en el esquema el flag viene apagado; en el `site.config.ts` de este sitio está encendido). Agregar o archivar un experimento cambia entonces lo que muestra esa tarjeta, sin otra edición:

- **Cuál**: el experimento más nuevo cuyo `status` no sea `archived`, por `publishedAt` (si falta, 1 de enero de su `year`). `featured` y `order` se ignoran a propósito: responde "¿qué hay de nuevo?", no "¿cuál es el más grande?".
- **Qué muestra**: el estado, el año, la portada (`images[0]`, si hay), el título, la descripción, hasta tres etiquetas y un enlace a su case page (`/experiments/<clave>/`).
- **Dónde**: después de cada nota, en la home (solo cuando `home.experiments` está apagado, porque esa cuadrícula ya lista los experimentos) y, flotante abajo al centro, cuando una nota ya se leyó en su mayor parte (`nudge.scrollThreshold`, por defecto 0.7) o al recorrer el listado de notas (`nudge.indexScrollThreshold`, 0.6). Nunca en `/me`, `/contact` ni `/experiments`.
- **Reglas de la flotante**: se abre solo después de que el visitante hace scroll, una vez por sesión, se esconde cerca del pie y mientras el foco del teclado está en otro lugar, y un cierre se recuerda durante `nudge.reappearAfterDays` (30 días por defecto; 0 significa para siempre), pasado lo cual la tarjeta puede volver a flotar. La tarjeta fija no desaparece nunca. Detalles en [DESIGN.md](DESIGN.md).
- **Costo**: suma unos 3,6 KB de CSS en línea y 7 KB de HTML a cada nota (los presupuestos de peso de `apps/web/scripts/page-weight-budget.json` se subieron por esto). Con el flag apagado no se envía nada.

## 4. Paginación y niveles de la lista

La lista se arma sola a partir de los datos; no hay nada que configurar por página.

- **Nivel grande:** las entradas `featured` (hasta `experiments.maxFeatured`). Van como piezas de exposición solo en la página 1.
- **Nivel compacto:** todas las demás, como tarjetas sobrias (portada solo si la entrada tiene imagen real, estado solo si no es «Publicado», hasta dos etiquetas). Se agrupan por año solo cuando la página visible tiene dos o más años y el orden es por fecha.
- **Paginación estática:** la página 1 (`/experiments/`, `/en/experiments/`) tiene todas las piezas grandes y las primeras `experiments.perPage` tarjetas (12 por defecto). Cuando hay más tarjetas, las siguientes páginas viven en `/experiments/page/2/`, `/experiments/page/3/` ... (y las gemelas `/en/...`), con `experiments.perPage` tarjetas cada una y sin piezas grandes. **Las páginas extra existen solo si hacen falta**: con hasta `perPage` tarjetas compactas no se genera ninguna y no aparece paginador. `/experiments/page/1/` no existe (responde 404; la página 1 es la URL base). Cada página tiene título, descripción, canonical, hreflang y `rel="prev"`/`rel="next"` propios, y entra al sitemap.
- **Orden:** `experiments.defaultSort` (`newest` por defecto), `experiments.sorts` (los órdenes que el visitante puede elegir: `newest`, `oldest`, `title` de A a Z) y `experiments.sortFrom` (4 por defecto). El orden aplica solo a las tarjetas compactas; las piezas grandes siempre van primero en la página 1. La fecha de una entrada es `publishedAt` (`AAAA-MM-DD`, opcional) o, si falta, el 1 de enero de su `year`; los empates se resuelven por `order` y luego por clave. El selector «Ordenar» y las páginas de los otros órdenes (`/experiments/oldest/`, `/experiments/oldest/page/2/` y las gemelas `/en/...`) existen solo cuando las tarjetas compactas son al menos `sortFrom` y hay más de un orden habilitado. Esas páginas llevan `noindex, follow`, canonical propio y no entran al sitemap: el orden por defecto es el único indexable, así no hay contenido duplicado. Todo son enlaces reales, sin orden ni filtrado en el cliente.
- **Filas de `/me`:** `experiments.meRows` (3 por defecto). Las primeras entradas según el orden siempre quedan en la página 1, así los enlaces `/experiments/#<id>` nunca apuntan a otra página. `meRows` nunca supera `perPage`: si es mayor, se baja a `perPage`.
- **Case pages:** cada experimento tiene su propia página `/experiments/<clave>/` (y la gemela `/en/...`): título, estado y año, luego las secciones problema, mi parte, galería, decisiones clave, tecnologías, resultado, lo que aprendí y qué haría distinto — cada una solo si la entrada tiene ese contenido — y, al final, la tarjeta «La nota donde hablo de esto» (solo si `note` existe). Las tarjetas de la lista, las filas de `/me` y el botón «Leer el caso» enlazan a esta página. Las secciones `decisions`, `tech`, `learned` y `different` aparecen cuando las llenes.
- **Costo:** los escenarios de estrés con 30 y 100 entradas midieron 929 y 919 bytes (aproximadamente 1 KB) de HTML marginal por tarjeta compacta, comparando solo la página 2 y las siguientes (la página 1 incluye las piezas grandes y tiene otro armazón). Depende del contenido de cada entrada. Mide tus propias entradas: la carga diferida y el renderizado fuera de pantalla no eliminan la descarga ni el procesamiento del HTML.
- **Cuándo se agregarían filtros o páginas por etiqueta** (no están implementados): con más de unas 24 entradas, o cuando las etiquetas ya sean variadas; siempre como páginas estáticas `/experiments/tag/<etiqueta>/`, nunca filtrado en el cliente.
- **Probar con muchos:** `pnpm stress:experiments [cantidad]` genera entradas en un espacio temporal (nunca toca tus archivos), compila y reporta páginas, bytes de HTML y costo por tarjeta; ver [TESTING.md](TESTING.md#stress-the-experiments-list-pnpm-stressexperiments).

### Reutilizar el kit de listados (para Formación u otra lista)

El orden, la paginación y los controles son genéricos y viven en `shared/`; Experimentos es solo el primer uso. Para una lista nueva:

1. **Lógica pura** (`apps/web/src/shared/lib/listing.ts`, con pruebas): `sortItems(items, clave, comparadores)` (estable), `paginate(items, { perPage, leading?, pinned? })`, `pageWindow(actual, total)`, `summaryRange(página, perPage, total)`, `listingPath({ base, sort, defaultSort, page })` y `availableSorts(...)`. No conocen la config ni Astro.
2. **Adaptador de la lista** (como `features/portfolio/lib/pagination.ts`): define los comparadores de tu lista (todos terminan en el mismo desempate: `order` y luego el id), qué entradas son contenido "líder" de la página 1 y llama al kit. Un archivo delgado con sus pruebas.
3. **Ajustes**: un bloque en `site.config.ts` con `perPage`, `defaultSort`, `sorts` y `sortFrom` (mismo esquema que `experiments`; las claves de orden son las de `LISTING_SORTS`) y `pnpm docs:config`.
4. **Rutas estáticas**: una página base, `page/[page]`, `[sort]` y `[sort]/page/[page]` (y las gemelas `/en/`), cada una con `getStaticPaths` que genere solo lo que existe: las rutas de un orden alternativo solo si está habilitado y la lista llega a `sortFrom`. Los órdenes alternativos llevan `noindex, follow`, canonical propio, `prev`/`next` dentro del mismo orden, hreflang al mismo orden y página, y quedan fuera del sitemap (`sitemap-filter.ts`).
5. **UI**: `shared/ui/Pager.astro`, `SortSwitch.astro` y `ListingSummary.astro` con tus URLs y etiquetas (`listing.*` en el diccionario). Son enlaces reales (el actual lleva `aria-current`); no hay orden ni filtrado en el cliente.
6. **Pruebas**: copia el patrón de `pnpm stress:experiments` para tu lista (páginas, enlaces, canonical, `noindex` y ausencia de rutas de órdenes deshabilitados).

Textos de la cabecera de la página (opcionales, con valor por defecto en el diccionario):

```ts
experiments: {
  perPage: 12,
  maxFeatured: 3,
  meRows: 3,
  defaultSort: "newest",
  sorts: ["newest", "oldest", "title"],
  sortFrom: 4,
  intro: { es: 'Proyectos que construí, decisiones que tomé y lo que aprendí.', en: 'Projects I built, decisions I made and what I learned.' },
  words: { es: ['construir', 'probar', 'aprender', 'repetir'], en: ['build', 'test', 'learn', 'repeat'] },
},
```

`words` es la pila decorativa de comentarios junto al título (solo escritorio, 1 a 6 palabras por idioma, el `// ` se agrega solo).

Estos ajustes son las opciones editoriales, no todas las constantes de presentación. Los límites de la galería (1-4 imágenes), las etiquetas visibles (3 en piezas grandes, 2 en tarjetas compactas), la ventana del paginador de siete páginas, las dimensiones de imágenes y los puntos de cambio de la cuadrícula siguen siendo reglas del esquema o de los componentes. La vista de notas en `/me` sigue mostrando tres notas; `experiments.meRows` solo controla experimentos. Cambiar esas reglas requiere código y las pruebas correspondientes, no otro campo en `site.config.ts`.

## 5. Experiencia laboral

`apps/web/src/content/experience.json`, una clave por puesto. Sin `end`, es el puesto actual.

```json
{
  "mi-empresa": {
    "role": { "es": "Desarrollador full-stack", "en": "Full Stack Developer" },
    "company": "Mi empresa",
    "start": 2024,
    "location": "Remoto",
    "summary": { "es": "Una línea honesta de lo que haces (hasta 280 caracteres).", "en": "One honest line about what you do." },
    "contributions": [
      { "es": "Algo concreto que entregaste (hasta 160 caracteres).", "en": "One concrete thing you delivered." }
    ],
    "tags": ["typescript", "cloudflare"]
  }
}
```

`contributions` es opcional: hasta cuatro resultados cortos y veraces del puesto (qué se entregó, con verbo y resultado), uno por idioma. Si no los tenés validados, omití el campo; el bloque no se dibuja.

Los resultados y aportes que no hayas validado no se publican: sin cifras, usuarios ni equipos inventados.

## 6. Certificados y formación

Los títulos y certificados viven en `apps/web/src/content/credentials.json` (una clave por entrada) y alimentan dos lugares:

- **`/education/`** (y `/en/education/`): la línea de tiempo completa, agrupada por año, del más reciente al más antiguo. Necesita `features.education`.
- **`/me`**: con `features.education` activa, un bloque compacto «Formación reciente» (las `education.meRows` más nuevas, 3 por defecto, cada una con enlace a su entrada) y un enlace «Ver mi recorrido de formación». Con `features.education` apagada, `/me` conserva la lista larga de certificados por año (necesita `features.credentials`).

```json
{
  "universidad-nacional": {
    "title": "Ingeniería en Programación",
    "issuer": "Universidad Nacional",
    "kind": "degree",
    "year": 2021,
    "order": 0
  }
}
```

### Cómo agregar una formación

1. Añade una clave nueva en kebab-case a `credentials.json`. La clave es el ancla: `/education/#<clave>` apunta a esa entrada (y `/me` enlaza a ella).
2. Campos obligatorios: `title` (máx. 120), `issuer` (máx. 80), `kind` (`degree`, `certificate` o `professional`) y `year`. Opcionales: `month` (1-12, se muestra y ordena las entradas dentro de su año), `url` (enlace https de verificación; aparece como «Verificar»), `credentialId`, `expires` (`AAAA-MM`).
3. **Orden dentro de un año:** primero `order` (entero, menor primero), después el mes (una entrada sin mes cuenta como el inicio del año), después la clave. El año manda. Fija `order` cuando quieras un orden editorial.
4. **Solo con contenido real:** `learnings` (1 a 8 puntos, aparecen en un bloque «Qué aprendí»), `appliedIn` («Dónde lo apliqué») e `image` (copia pública del documento) se muestran únicamente cuando existen; nunca se inventa texto. La única excepción es el espacio del documento: sin `image`, la entrada muestra una portada tipográfica decorativa (año, tipo y emisor, solo con CSS) hasta que haya una copia real. En pantallas anchas el documento ocupa una columna de 20rem junto al texto, y al pulsar la miniatura se abre una copia mayor en un visor (un enlace simple a la imagen si JavaScript está desactivado). Las imágenes van en `apps/web/src/assets/education/<archivo>` (nunca en `public/`; si falta el archivo, el build falla) y llevan `alt`.
5. Los textos aceptan una cadena o un objeto por idioma (`{ "es": "…", "en": "…" }`).
6. Ejecuta `pnpm docs:config` si cambiaste el esquema y revisa `/education/` en local.

### Ajustes de la página

El bloque `education` de `site.config.ts` (todo opcional): `perPage` (entradas por página, 12), `sortFrom` (desde cuántas entradas aparece el selector «más antiguas primero» y la página `/education/oldest/`, que no se indexa; 4), `meRows` (filas de `/me`, 3) e `intro` (texto bajo el título, por idioma). El detalle está en [CONFIGURATION.md](CONFIGURATION.md).

## 7. Lista de verificación antes de publicar

1. **Privacidad:** ningún correo en archivos versionados (el contacto va por `/contact`), ningún repositorio privado nombrado o enlazado, capturas sin datos personales ni de terceros.
2. **Textos validados:** el aporte, el resultado y las cifras son verdad y los revisaste; lo que falta por validar no se publica.
3. **Imágenes:** propias, en `apps/web/src/assets/experiments/<clave>/`, con `alt` (política en [DESIGN.md](DESIGN.md#images-of-experiments-and-credentials-policy-2026-10-06) y [ADR 0015](adr/0015-images-live-in-the-repository.md)).
4. `pnpm docs:config` si cambiaste un esquema o `shared/config/env-vars.ts`.
5. `pnpm test` (y `pnpm typecheck` / `pnpm lint`).
6. `pnpm verify` (imprime el plan de verificación del trabajo sin confirmar; `--run` lo ejecuta).
7. **Changelog:** una entrada en `apps/web/src/content/changelog.json` por cada cambio visible, en inglés, el día en que llega a producción.
8. Publicar a `main` sigue el procedimiento de la sección 7 de [CONFIGURATION.md](CONFIGURATION.md).

## 8. Límites y errores

| Qué | Límite | Qué pasa si te pasas |
| --- | --- | --- |
| `experiments.perPage` | entero de 4 a 48 (12 por defecto) | el build falla y nombra el campo |
| `experiments.maxFeatured` | entero de 1 a 6 (3 por defecto) | el build falla; más destacados que el límite también falla |
| `experiments.meRows` | entero de 1 a 6 (3 por defecto), nunca más que `perPage` | si supera `perPage`, se baja a `perPage` |
| `experiments.defaultSort` | `newest`, `oldest` o `title` (`newest` por defecto), debe estar en `sorts` | el build falla y nombra el campo |
| `experiments.sorts` | al menos un orden de `newest`, `oldest`, `title` | el build falla; con un solo orden no aparece el selector |
| `experiments.sortFrom` | entero de 2 a 48 (4 por defecto) | por debajo de ese número de tarjetas compactas no hay selector ni páginas de otros órdenes |
| `publishedAt` de un experimento | fecha `AAAA-MM-DD` válida | el build falla |
| `experiments.intro` | texto por idioma (idioma por defecto obligatorio) | el build falla si falta el idioma por defecto o sobra uno no soportado |
| `experiments.words` | de 1 a 6 palabras por idioma, hasta 24 caracteres cada una | el build falla |
| `images[]` de un experimento | de 1 a 4, nombre de archivo sin carpetas | el build falla; un archivo inexistente también |
| `description`, `problem`, `contribution`, `result`, `subtitle` | hasta 200 caracteres por idioma | el build falla |
| `images[].alt` / `caption` | hasta 140 / 120 caracteres | el build falla |
| `tags` | hasta 5, kebab-case | el build falla |
| `url`, `repo` | solo https | el build falla |
| `note` | slug de una nota publicada | el build falla |
| `summary` de experiencia | hasta 280 caracteres por idioma | el build falla |
