# Cómo crear una nota (post)

**Español** · [English](NOTES.en.md)

Esta guía explica, paso a paso y con todos los detalles, cómo escribir y publicar una nota de **Lab Notes**. Para el resto de la configuración del sitio, mira la [guía de configuración](CONFIGURATION.md).

- [Resumen en 9 pasos](#resumen-en-9-pasos)
- [1. Qué es una nota aquí](#1-qué-es-una-nota-aquí)
- [2. Crear el borrador](#2-crear-el-borrador)
- [3. El frontmatter, campo por campo](#3-el-frontmatter-campo-por-campo)
- [4. El registro de decisión](#4-el-registro-de-decisión)
- [5. Escribir el cuerpo](#5-escribir-el-cuerpo)
- [6. Ver el resultado](#6-ver-el-resultado)
- [7. Qué hace el sitio por ti](#7-qué-hace-el-sitio-por-ti)
- [8. Traducir una nota](#8-traducir-una-nota)
- [9. Publicar](#9-publicar)
- [10. Editar o retirar una nota publicada](#10-editar-o-retirar-una-nota-publicada)
- [11. Lista de verificación antes de publicar](#11-lista-de-verificación-antes-de-publicar)
- [12. Errores frecuentes](#12-errores-frecuentes)

## Resumen en 9 pasos

1. Crea el borrador: `mise exec -- pnpm new-post "Título de la nota"`.
2. Arranca el sitio: `mise exec -- pnpm --filter web dev` y abre `http://localhost:4321/notes/<slug>/` (los borradores solo existen en desarrollo).
3. Completa el frontmatter y el **registro de decisión** (sección 3 y 4).
4. Escribe sobre **una** decisión concreta, empezando por el problema. No hay límite de palabras: el borrador sugiere unas 500, pero una nota más larga está bien cuando la decisión lo pide (la nota 003 tiene unas 1.500).
5. Revisa el resultado en escritorio y móvil, en tema claro y oscuro, y en modo lectura.
6. Ensaya la publicación: `mise exec -- pnpm publish-note <slug> --dry-run` (no cambia nada).
7. Publica: `mise exec -- pnpm publish-note <slug>`. Mueve la carpeta, pone la fecha de hoy, añade la entrada del changelog, compila, hace commit y release.
8. Espera al CI: una nota usa el carril rápido (unos minutos, sin `e2e` ni Lighthouse).
9. Revisa la nota en vivo (tarjeta al compartir y comentarios).

## 1. Qué es una nota aquí

Lab Notes **documenta decisiones y su razonamiento**, no tutoriales genéricos. Cada nota es una entrada numerada («Nota 001») escrita en **un solo idioma** y resumida por un *registro de decisión* (contexto, decisión, resultado) que aparece antes del texto.

La voz está definida en [`docs/BRAND.md`](BRAND.md). Las reglas que más importan al escribir:

- **Primera persona, directa y concreta.** Números y nombres, no adjetivos («pasó de 2,4 s a 1,5 s», no «mucho más rápido»).
- **Atemporal**: nada que dependa de «lo que estoy haciendo este mes».
- **Los frameworks se nombran como herramientas**, no como identidad profesional.
- **Humor con medida**; no compite con el contenido.
- **Nunca anuncies un proyecto que aún no existe**, ni enlaces un repositorio **privado**, ni escribas tu correo en texto plano (el contacto es `/contact`).

## 2. Crear el borrador

```bash
mise exec -- pnpm new-post "Por qué descarté X"                 # español (por defecto)
mise exec -- pnpm new-post "Why I dropped X" --lang en           # inglés
mise exec -- pnpm new-post "Why I dropped X" --lang en --number 3  # traducción: reutiliza el número
```

Qué hace el comando:

- Crea `apps/web/src/content/drafts/<slug>/index.mdx`. El **slug** sale del título: sin tildes, en minúsculas y con guiones (`Por qué descarté X` → `por-que-descarte-x`). Si ya existe una nota o borrador con ese slug, se niega a continuar.
- Asigna el **número** siguiente al más alto entre notas y borradores (o el que pidas con `--number`).
- Pone como `pubDate` la **fecha local de hoy** y rellena el frontmatter con valores de ejemplo válidos, para que el borrador ya se vea en desarrollo.
- Deja una frase guía en el cuerpo: *escribe unas 500 palabras sobre una decisión concreta; empieza por el problema.*

> **Los borradores no están en git.** La carpeta `drafts/` está ignorada a propósito: no llegan al repositorio ni a producción, y por eso tampoco tienen respaldo. Haz una copia si el borrador es largo.

## 3. El frontmatter, campo por campo

Es el bloque entre `---` al inicio del archivo. El sitio lo valida al compilar: un valor inválido rompe el build y dice el archivo y el campo. La tabla se genera desde el esquema (por eso está en inglés):

<!-- docs:start note-frontmatter -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `number` | `integer` | yes |  | Entry number shown as `Nota 001`; a translation reuses the number of its original. |
| `title` | `string (max 90)` | yes |  | Note title (max 90 characters): the page title and the headline of the share card. |
| `description` | `string (max 160)` | yes |  | One sentence for search results and link previews (max 160 characters). |
| `pubDate` | `date (YYYY-MM-DD)` | yes |  | Publication date. Notes with the same date sort by number, highest first. |
| `updatedDate` | `date (YYYY-MM-DD)` | no |  | Date of the last meaningful edit; must not be earlier than `pubDate`. |
| `lang` | `'es' \| 'en'` | yes |  | Language the note is written in (one language per note). |
| `translationOf` | `string` | no |  | Slug of the same note in the other language. One side is enough (the link works both ways). Both notes then point at each other with hreflang and the language switch goes to the translation. The target must be published too, or the build fails. |
| `category` | `string` | yes |  | One category in kebab-case (for example `decisiones`); shown above the title and used to group the index. |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
| `startHere` | `1 \| 2 \| 3` | no |  | Marks the note as a start-here entry point and sets its order (1 to 3). Each value can be used once per language; requires `startHereNote`. |
| `startHereNote` | `string (max 120)` | no |  | One line saying why to start with this note (max 120 characters); required when `startHere` is set. |
| `decision` | `object` | yes |  | Decision record shown before the text: context, decision and outcome. |
| `decision.context` | `string (max 280)` | yes |  | What forced a decision (max 280 characters). |
| `decision.decision` | `string (max 280)` | yes |  | What you chose and what you ruled out (max 280 characters). |
| `decision.outcome` | `string (max 280)` | yes |  | What happened next (max 280 characters). |
<!-- docs:end note-frontmatter -->

Un ejemplo completo, tomado de una nota real:

```yaml
---
number: 1
title: "Cómo construí este sitio: decisiones, presupuestos y un CI que fui simplificando"
description: "Del plan a producción en menos de una semana: qué decidí, qué medí y qué se rompió."
pubDate: 2026-10-01
lang: es
category: decisiones
tags: [astro, cloudflare, arquitectura, ci, testing]
decision:
  context: "Tenía un sitio anterior que funcionaba, pero quería una base reutilizable y medible."
  decision: "Reconstruir desde cero: monorepo, identidad por configuración y presupuestos en CI."
  outcome: "En producción desde el 1 de octubre de 2026, con Lighthouse móvil de 95 o más."
---
```

Detalles que evitan errores:

- **`title`**: entre comillas dobles (los dos puntos y otros signos rompen el YAML sin comillas). Máximo 90 caracteres. Es el título de la página, el titular de la tarjeta al compartir y el texto del buscador: hazlo concreto.
- **`description`**: una frase, máximo 160. Es lo que ve alguien en los resultados de búsqueda y en la vista previa del enlace. No repitas el título.
- **`pubDate`**: formato `AAAA-MM-DD` (el borrador lo escribe sin comillas). Dos notas con la misma fecha se ordenan por número (la de número mayor primero).
- **`number`**: la primera nota es 1. Una traducción reutiliza el número del original.
- **`category`**: una sola, en minúsculas con guiones. No hay una lista cerrada; **mantén las mismas** que ya usas (las que ves en la barra lateral del índice) para que agrupen bien.
- **`tags`**: hasta cinco, en minúsculas con guiones. Se usan para calcular las «notas relacionadas».
- **`startHere` y `startHereNote`**: opcionales, van juntos. Marcan la nota como puerta de entrada (sección 3.1).
- **`updatedDate`**: solo cuando editas una nota ya publicada de forma relevante (sección 10).
- **`translationOf`**: el slug de la misma nota en el otro idioma (sección 8). Con indicarlo en una de las dos notas basta.

### 3.1. Notas «Empieza aquí»

`/notes/` abre con un bloque «Empieza aquí» de tres notas, y al final de cada nota «Sigue leyendo» muestra primero esas mismas notas (si el lector no las acaba de ver en anterior/siguiente) y después las relacionadas. Se eligen con dos campos en la propia nota:

```yaml
startHere: 2
startHereNote: "Mi tesis: entender y escribir la intención antes de pedirle código a la IA."
```

- `startHere` es el orden: `1`, `2` o `3`, sin repetir dentro de un mismo idioma. `startHereNote` es la razón en una línea (máximo 120 caracteres) y es obligatoria si hay `startHere`.
- Si hay menos de tres marcadas en un idioma, el resto se completa con las notas más recientes de ese idioma (y el build avisa con un `warning`). El bloque nunca queda vacío ni desactualizado.
- El build **falla** si hay un `startHere` repetido en el mismo idioma, si falta la razón o si el valor no está entre 1 y 3.
- **Cómo elegir**: una nota que sirva de puerta de entrada a quien no conoce el sitio: la visión de conjunto, la tesis y un caso concreto con números. No hace falta tocar nada al publicar una nota normal; revisa las marcas solo cuando salga una nota mejor como entrada (en la práctica, cada pocas notas).
- Para cambiar una marca, quita `startHere` y `startHereNote` de la nota anterior y ponlos en la nueva; si retiras una nota marcada, el bloque se completa solo.

### 3.2. Temas (páginas estáticas)

Las etiquetas filtran en el navegador (`/notes/?tag=x`), pero un filtro no es una página que un buscador pueda indexar. Los **temas** sí: `/notes/tag/<tema>/` es una página estática con su título, su descripción, una introducción tuya y la lista de sus notas (la más reciente primero), con migas de pan (`BreadcrumbList`) y entrada en el sitemap. Se definen en `apps/web/src/content/topics.json`, un objeto cuya clave es el slug de la URL:

```json
"rendimiento-y-verificacion": {
  "title": "Rendimiento y verificación",
  "description": "Hasta 160 caracteres para el buscador.",
  "intro": "Entre 40 y 80 palabras escritas por ti, únicas para este tema.",
  "tags": ["rendimiento", "lcp", "lighthouse", "testing"]
}
```

- `tags` son etiquetas **crudas** de las notas: varias pueden apuntar al mismo tema, y una nota pertenece al tema si **cualquiera** de sus etiquetas está en la lista. Una nota puede estar en varios temas. Todas las etiquetas listadas deben existir en alguna nota.
- Un tema solo tiene página si tiene `intro` y al menos `notes.topicMinNotes` notas en español (2 por defecto; ajuste en `site.config.ts`, sección 3 de `CONFIGURATION.md`). Si no, no se genera, no entra en el sitemap y sus chips siguen apuntando al filtro; el build avisa con un `warning`.
- Los chips de etiqueta (en las notas, en `/notes/` y en la barra lateral) enlazan a la página del tema cuando la etiqueta pertenece a uno que existe; si pertenece a dos, gana el primero del archivo. `/notes/` muestra la lista corta «Temas» para que los buscadores lleguen a ellas. `/notes/?tag=x` sigue funcionando y su canonical apunta a `/notes/`.
- El build **falla** si un tema lista una etiqueta que ninguna nota tiene, repite el slug, usa un slug reservado (`page`, `tag`, `tags`) o no está en kebab-case, si `description` supera 160 caracteres o si `intro` no tiene entre 40 y 80 palabras.
- **Cuándo crear un tema**: cuando varias notas cuentan una misma historia y puedes escribir una introducción que diga algo que las notas por separado no dicen. No hace falta un tema por etiqueta: las páginas delgadas perjudican más de lo que ayudan.

## 4. El registro de decisión

Son tres frases de **máximo 280 caracteres** cada una; se muestran en tres columnas antes del texto. Es lo primero que lee la gente, así que sirve como resumen autónomo:

| Campo | Pregunta que responde | Ejemplo |
| --- | --- | --- |
| `context` | ¿Qué te obligó a decidir? | «Tenía un sitio anterior que funcionaba, pero quería una base reutilizable y medible.» |
| `decision` | ¿Qué elegiste y qué descartaste? | «Reconstruir desde cero: monorepo, identidad por configuración y presupuestos en CI.» |
| `outcome` | ¿Qué pasó después, con números? | «En producción desde el 1 de octubre de 2026, con Lighthouse móvil de 95 o más.» |

Una buena señal: si alguien lee solo estas tres frases, entiende la decisión. Una mala: adjetivos sin datos («una solución mucho mejor»).

## 5. Escribir el cuerpo

El cuerpo es **Markdown con MDX**. El sitio no define componentes propios, así que quédate en Markdown estándar.

**Estructura**

- **No pongas un título `#`**: el título sale del frontmatter.
- Usa `##` para las secciones principales: son las que forman el **índice lateral con progreso** y reciben un ancla automática. Usa `###` para subsecciones (no aparecen en el índice).
- Una idea por sección. Las notas van de unas 500 a 1.500 palabras y la extensión la decide quien escribe, no es un límite; la guía del borrador pide empezar por el problema.

**Formato disponible** (verificado con una nota de prueba):

- Párrafos, **negrita**, *cursiva* y `código en línea`.
- Listas con viñetas, numeradas y de tareas (`- [ ]`).
- Citas con `>`: se dibujan con una barra rosa; úsalas para la idea clave.
- Notas al pie (`texto[^1]` y `[^1]: ...`).
- Tablas: se renderizan, pero **no tienen estilo propio** del sitio y en móvil pueden verse planas o desbordarse. Prefiere listas; si usas una, míra la en 360 px.

**Código**

Bloques con lenguaje, y opcionalmente título y marcas de línea (los provee Expressive Code, con botón de copiar y temas claro y oscuro):

````md
```ts title="adapters/turnstile.ts" {2} ins={3}
const a = 1;
const marcada = 2;
const añadida = 3;
```
````

- `title="archivo.ts"` pone el nombre de archivo en el marco.
- `{2}` resalta la línea 2; `ins={3}` / `del={3}` la marcan como añadida o eliminada.
- Para diagramas, usa un bloque `txt` con arte ASCII (no hay Mermaid).

**Imágenes**

Pon el archivo junto a `index.mdx` y refiérelo con ruta relativa:

```md
![Descripción de lo que muestra la imagen](./captura.png)
```

El sitio la optimiza solo (la convierte a WebP, fija ancho y alto y la carga de forma diferida) y la enmarca con las mismas esquinas redondeadas y el mismo borde fino que sus tarjetas. **Escribe siempre el texto alternativo.**

Consejos, medidos con una nota de prueba:

- Con una captura de 1.600 px de ancho basta: un PNG de 61 KB pasó a un WebP de 21,5 KB, y la columna de texto lo muestra a unos 750 px (unos 320 px en el móvil). No subas originales de varios MB.
- Las imágenes cargan de forma diferida y llevan sus dimensiones, así que no mueven el texto ni retrasan el primer pintado. Deja la primera pantalla solo con texto: pon las imágenes después de la primera sección, nunca antes del título.
- Una captura con tema oscuro se ve bien en los dos temas gracias al borde fino; evita capturas con fondo transparente.
- **Antes de publicar, comprueba que la imagen no muestre ningún correo, token, repositorio privado ni dato personal.**
- La tarjeta para compartir se genera a partir del título, no de las imágenes de la nota.

**Enlaces**

- A otra nota: `/notes/otro-slug/`. A un sitio externo: la URL completa.
- Nunca enlaces repositorios privados ni escribas un correo.

## 6. Ver el resultado

```bash
mise exec -- pnpm --filter web dev
```

En desarrollo, el índice `/notes/` muestra **notas y borradores** juntos. Revisa:

- **Escritorio y móvil**: abre las herramientas del navegador y prueba 360 px de ancho.
- **Tema claro y oscuro**: con el botón del menú.
- **Modo lectura**: el botón al inicio de la nota. Comprueba que el texto se lee bien en una sola columna.
- **Índice lateral, registro de decisión y anterior/siguiente.**

Dos cosas que **no** verás en desarrollo:

- **La tarjeta al compartir**: se genera al compilar. Para verla, publica la nota (sección 9), ejecuta `mise exec -- pnpm --filter web build` y abre `apps/web/dist/client/og/notes/<slug>.png`.
- **Comentarios reales**: la sección carga Giscus de verdad. **No publiques comentarios de prueba desde `localhost`**: crearían un hilo real en el repositorio.

## 7. Qué hace el sitio por ti

Al publicar una nota **no tienes que hacer nada más** para esto:

- Aparece en el **índice** (agrupada por año) con su insignia de idioma, y la entrada «Notas» del menú aparece con la primera nota publicada.
- **Tiempo de lectura** (a 220 palabras por minuto) y **fecha** en el encabezado.
- **Índice lateral** con las secciones `##`, **botones de compartir** (copiar enlace, X, WhatsApp y LinkedIn: enlaces simples sin ningún script de terceros; X y WhatsApp rellenan el mensaje con el título de la nota) y **«Sigue leyendo»**: hasta tres notas del mismo idioma, primero las marcadas como «Empieza aquí» y luego las que comparten etiquetas (pesan el doble) o categoría; nunca repite la nota actual ni la anterior y la siguiente.
- **Anterior / Siguiente** entre notas del mismo idioma.
- Si la nota tiene traducción: **`hreflang`** entre ambas y el **cambio de idioma** directo (sección 8).
- **Comentarios y reacciones** (si Giscus está configurado): el hilo se asocia a la ruta de la nota.
- **Tarjeta al compartir** propia (1200 × 630) con «Nota 001», el título, tu nombre y la fecha.
- **Metadatos para buscadores y redes**: tipo `article`, fechas, etiquetas y datos estructurados `BlogPosting` con imagen y autor.
- **RSS** (`/rss.xml`) y **sitemap**.

## 8. Traducir una nota

Una traducción es **otra nota** en el otro idioma, no una versión conmutable:

```bash
mise exec -- pnpm new-post "Why I rebuilt my site from scratch" --lang en --number 1
```

- Reutiliza el **mismo número** del original y escribe el texto en el otro idioma (adáptalo, no lo traduzcas palabra por palabra).
- Una nota en inglés se sirve en `/en/notes/<slug>/` y aparece en el **índice** (que es uno solo, en español) con su insignia de idioma. No hay un índice en inglés.
- Cada idioma tiene su propia conversación de comentarios, y «relacionadas» y «anterior/siguiente» solo recorren notas del mismo idioma.
- Enlázalas con `translationOf`: en la traducción pon el slug del original (o al revés; **con un lado basta**, funciona en los dos sentidos). Con tres idiomas o más, todas quedan en el mismo grupo.
- Entonces las dos notas se declaran mutuamente con `hreflang` (más `x-default`, que apunta a la versión en el idioma por defecto), y el **cambio de idioma del menú** y la **sugerencia de idioma** llevan directamente a la traducción en lugar de a la home del otro idioma. Una nota sin traducción sigue llevando a la home.
- Los **slugs pueden ser distintos** en cada idioma (`por-que-descarte-x` y `why-i-dropped-x`).
- Si `translationOf` apunta a una nota que no existe (por ejemplo, un borrador sin publicar), **el build falla** con el nombre de las notas: publica las dos juntas o quita `translationOf` hasta entonces. También falla si una nota se traduce a sí misma, si la traducción está en el mismo idioma o si dos notas del mismo idioma quedan en un grupo.

## 9. Publicar

**Camino normal: un comando.** Con la nota terminada y el árbol de git limpio, en `develop`:

```bash
mise exec -- pnpm publish-note <slug> --dry-run   # ensayo: muestra los pasos y no cambia nada
mise exec -- pnpm publish-note <slug>             # publica
```

Hace, en orden y deteniéndose en el primer fallo: mueve `drafts/<slug>` a `notes/<slug>`, pone `pubDate` con la fecha local de hoy, añade la entrada `note-NNN` al `changelog.json`, compila (el build valida el frontmatter y `translationOf`; si falla, la nota vuelve a `drafts/`), fecha el changelog, hace el commit `feat(notes): publish "Título"`, comprueba la auditoría del changelog, empuja `develop` y publica el release en `main`. **Ejecutarlo es tu autorización para empujar a `main`.** Con `--no-release` se detiene tras el commit local.

Ese push dispara el CI por el **carril rápido para notas** ([ADR 0016](adr/0016-publish-note-command-and-notes-fast-lane.md)): si el push solo toca notas publicadas y el changelog, se saltan `e2e` y Lighthouse y corren `static`, `notes-gate` (build y presupuestos de peso) y el deploy con su smoke-check. Si el push incluye cualquier otro cambio, corre todo. Mira el run con `gh run watch`; si algo falla, no hay deploy.

Después, en producción: abre la nota, comprueba que la tarjeta se ve bien al compartir el enlace (refresca la caché con el [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o el [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)) y que los comentarios cargan. Si la suscripción está encendida, avisa a la lista con `SUBSCRIBE_ADMIN_TOKEN=... pnpm notify:note <slug>` (prueba en seco) y luego con `--send` (receta 6.14).

**Camino manual** (si quieres pasar por todas las compuertas locales antes de liberar):

1. Mueve la carpeta: `mv apps/web/src/content/drafts/<slug> apps/web/src/content/notes/<slug>` (es un `mv` normal: `drafts/` no está en git). La URL final es `/notes/<slug>/`, igual que en el borrador.
2. Pon en `pubDate` la fecha de publicación.
3. Verifica: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build`, `pnpm check:page-weight`, `pnpm check:js-budget` y `pnpm test:e2e` (los tests de navegador usan notas de prueba aisladas: tus notas reales no entran; los dos checks de tamaño sí revisan el build real).
4. Revisa la tarjeta: `apps/web/dist/client/og/notes/<slug>.png`.
5. Commit, con mensaje convencional: `feat(notes): publish "Título"`. Si quieres avisar a los visitantes, añade una entrada al `changelog.json` (guía de configuración, receta 6.4).
6. Push a `develop` y release a `main` ([guía de configuración, sección 7](CONFIGURATION.md#7-publicar-release-y-revertir)).
   Si la suscripción está encendida, una vez liberada avisa a la lista con `SUBSCRIBE_ADMIN_TOKEN=... pnpm notify:note <slug>` (prueba en seco) y luego con `--send` (receta 6.14).
7. Ya en producción: abre la nota, comprueba que la tarjeta se ve bien al compartir el enlace (refresca la caché con el [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o el [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)) y que los comentarios cargan.

## 10. Editar o retirar una nota publicada

### Tamaño al publicar

Agregar una nota o alargar su texto no exige cambiar el presupuesto de HTML. `check:page-weight`
separa el cuerpo renderizado de la estructura fija del artículo y da al índice un margen por cada
nota publicada. CSS, JavaScript y Lighthouse conservan sus límites. El reporte muestra los bytes
de artículo o el número de notas junto al total; detalles en
[Content-aware notes budgets](TESTING.md#content-aware-notes-budgets-2026-10-11).

Si falla `article`, revisa bloques de código y contenido especialmente largos: el cuerpo tiene un
techo de 64 KiB de HTML renderizado. Si falla el HTML del artículo con el cuerpo dentro del límite,
creció la estructura fija. Si el índice llega a 180000 B, necesita paginación o simplificación.
No subas límites automáticamente ni muevas elementos de interfaz entre los marcadores de contenido.
Para una nota con imágenes grandes o mucho código, mide también esa URL real: Lighthouse usa fixtures.

- **Editar**: cambia el texto y añade `updatedDate` con la fecha de hoy (no puede ser anterior a `pubDate`). Aparece en la nota y en los metadatos. `publish-note` solo publica borradores: para una edición haz commit en `develop` y libera a mano ([guía de configuración, sección 7](CONFIGURATION.md#7-publicar-release-y-revertir)). Si el push solo toca notas, igualmente usa el carril rápido.
- **No cambies el slug** (el nombre de la carpeta): es la URL y el sitio **no tiene redirecciones**; los enlaces y los comentarios apuntan a ella.
- **Retirar**: mueve la carpeta de vuelta a `drafts/` (deja de publicarse en el siguiente release) o bórrala. La URL pasará a dar 404. Tampoco hay comando para esto: commit y release manual.

## 11. Lista de verificación antes de publicar

- [ ] Una sola decisión, empezando por el problema; números y nombres, no adjetivos.
- [ ] `title` ≤ 90, `description` ≤ 160, cada campo de `decision` ≤ 280, máximo 5 `tags`.
- [ ] `category` y `tags` en minúsculas con guiones y coherentes con tus otras notas.
- [ ] `pubDate`: `publish-note` lo pone con la fecha de hoy; en la publicación manual, con la fecha real en formato `AAAA-MM-DD`.
- [ ] Sin título `#`; secciones con `##`.
- [ ] Todas las imágenes tienen texto alternativo, miden unos 1.600 px de ancho como máximo y no muestran datos privados.
- [ ] Ningún repositorio privado, ningún correo, ningún proyecto que aún no exista.
- [ ] Si tiene traducción, `translationOf` apunta a una nota que también se publica.
- [ ] Se lee bien en 360 px, en tema claro y oscuro y en modo lectura.
- [ ] `pnpm test`, `typecheck`, `lint` y `build` pasan (`publish-note` ya ejecuta el build; el resto es del camino manual).
- [ ] Después del build real, `pnpm check:page-weight` y `pnpm check:js-budget` pasan. `publish-note` **no** los ejecuta: los corre el CI (`notes-gate`) después del push y, si fallan, no hay deploy. En una nota larga o con imágenes grandes, córrelos antes de publicar.
- [ ] La tarjeta de `dist/client/og/notes/<slug>.png` se ve bien.

## 12. Errores frecuentes

| Qué ves | Causa y solución |
| --- | --- |
| El build falla con el nombre de un campo | El frontmatter rompe el esquema (límites de la sección 3). El mensaje indica archivo y campo |
| `title` rompe el YAML | Falta poner el título entre comillas dobles |
| La nota no aparece en `/notes/` | Está en `drafts/` y no estás en desarrollo, o falta `index.mdx` dentro de la carpeta |
| La nota aparece pero con fecha rara | `pubDate` debe estar en formato `AAAA-MM-DD` (no `01/10/2026`) |
| La tarjeta al compartir no existe en desarrollo | Es normal: solo se genera al compilar notas publicadas (sección 6) |
| Los comentarios no aparecen | Revisa la receta 6.5 de la guía de configuración |
| La imagen no se muestra | La ruta relativa es incorrecta o el archivo no está junto a `index.mdx` |
| El build dice «says it translates … which does not exist» | `translationOf` apunta a un slug que no existe o es un borrador: publica ambas notas o quita `translationOf` |
| La tabla se ve plana en el móvil | Las tablas no tienen estilo propio: cámbiala por una lista |
| `publish-note` dice «run it on the develop branch» o «uncommitted changes» | Debe ejecutarse en `develop` con el árbol limpio (los borradores no cuentan: `drafts/` está ignorado). Haz commit o `stash` y repite |
| `publish-note` dice «no draft at …» o «already exists» | El slug no coincide con una carpeta de `drafts/`, o ya existe una nota publicada con ese slug o una entrada `note-NNN` en el changelog |
| `publish-note` dice «the build failed; the note was moved back to drafts» | Arregla el error que imprimió el build (campo o `translationOf`) y repite; no quedó nada a medias |
| El CI de la nota corrió `e2e` y Lighthouse | El push incluía algo más que notas y changelog (por ejemplo `topics.json` o código): ese release usa todas las compuertas. Mira el resumen del job `changes` |
| `notes-gate` falla por peso | La nota o sus imágenes superan un presupuesto (sección 10, «Tamaño al publicar»). No hubo deploy: corrige, haz commit y libera de nuevo |
