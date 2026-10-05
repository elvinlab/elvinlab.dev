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
6. Mueve la carpeta a `apps/web/src/content/notes/<slug>/` y pon la fecha de hoy en `pubDate`.
7. Verifica: tests, typecheck, lint y build.
8. Haz commit (opcional: una entrada en el changelog) y push a `develop`.
9. Publica el release y revisa la nota en vivo (tarjeta al compartir y comentarios).

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
- **`updatedDate`**: solo cuando editas una nota ya publicada de forma relevante (sección 10).
- **`translationOf`**: el slug de la misma nota en el otro idioma (sección 8). Con indicarlo en una de las dos notas basta.

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

El sitio la optimiza solo (la convierte a WebP, fija ancho y alto y la carga de forma diferida). **Escribe siempre el texto alternativo.**

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
- **Índice lateral** con las secciones `##`, **botones de compartir** (copiar enlace y LinkedIn) y **notas relacionadas**: las del mismo idioma que comparten etiquetas (pesan el doble) o categoría; salen hasta tres.
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

1. Mueve la carpeta: `mv apps/web/src/content/drafts/<slug> apps/web/src/content/notes/<slug>` (es un `mv` normal: `drafts/` no está en git). La URL final es `/notes/<slug>/`, igual que en el borrador.
2. Pon en `pubDate` la fecha de publicación.
3. Verifica: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build` y `pnpm test:e2e` (los tests de navegador usan notas de prueba aisladas: tus notas reales no entran).
4. Revisa la tarjeta: `apps/web/dist/client/og/notes/<slug>.png`.
5. Commit, con mensaje convencional: `feat(notes): publish "Título"`. Si quieres avisar a los visitantes, añade una entrada al `changelog.json` (guía de configuración, receta 6.4).
6. Push a `develop` y release a `main` ([guía de configuración, sección 7](CONFIGURATION.md#7-publicar-release-y-revertir)).
7. Ya en producción: abre la nota, comprueba que la tarjeta se ve bien al compartir el enlace (refresca la caché con el [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o el [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)) y que los comentarios cargan.

## 10. Editar o retirar una nota publicada

- **Editar**: cambia el texto y añade `updatedDate` con la fecha de hoy (no puede ser anterior a `pubDate`). Aparece en la nota y en los metadatos.
- **No cambies el slug** (el nombre de la carpeta): es la URL y el sitio **no tiene redirecciones**; los enlaces y los comentarios apuntan a ella.
- **Retirar**: mueve la carpeta de vuelta a `drafts/` (deja de publicarse en el siguiente release) o bórrala. La URL pasará a dar 404.

## 11. Lista de verificación antes de publicar

- [ ] Una sola decisión, empezando por el problema; números y nombres, no adjetivos.
- [ ] `title` ≤ 90, `description` ≤ 160, cada campo de `decision` ≤ 280, máximo 5 `tags`.
- [ ] `category` y `tags` en minúsculas con guiones y coherentes con tus otras notas.
- [ ] `pubDate` con la fecha real, en formato `AAAA-MM-DD`.
- [ ] Sin título `#`; secciones con `##`.
- [ ] Todas las imágenes tienen texto alternativo.
- [ ] Ningún repositorio privado, ningún correo, ningún proyecto que aún no exista.
- [ ] Si tiene traducción, `translationOf` apunta a una nota que también se publica.
- [ ] Se lee bien en 360 px, en tema claro y oscuro y en modo lectura.
- [ ] `pnpm test`, `typecheck`, `lint` y `build` pasan.
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
